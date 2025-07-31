import nodemailer from 'nodemailer';
import { launchEmailService, sendWelcomeEmail, resetTransporterForTesting } from '../src/services/launchEmailService';
import { UserPayload } from '../src/types/user';

// --- Mocks do Nodemailer ---
jest.mock('nodemailer', () => ({
  // Mock para a função createTransport
  createTransport: jest.fn(() => ({
    // Retorna um objeto que simula o transporter
    verify: jest.fn(() => Promise.resolve(true)), // Mocka o verify para sempre retornar sucesso
    sendMail: jest.fn(() => Promise.resolve({ // Mocka o sendMail para retornar uma info de sucesso
      messageId: 'mock-message-id',
      response: '250 OK',
    })),
  })),
  // Mocka getTestMessageUrl, pois ele é uma função auxiliar do nodemailer
  getTestMessageUrl: jest.fn(() => 'http://ethereal.email/message/mock-message-url'),
}));

// Mock das variáveis de ambiente
// Para controlar ETHEREAL_USER e ETHEREAL_PASS nos testes
const mockEtherealUser = 'testuser@ethereal.email';
const mockEtherealPass = 'testpass';

describe('Launch Email Service', () => {
  // Limpa os mocks antes de cada teste
  beforeEach(() => {
    jest.clearAllMocks();
    // Reseta as variáveis de ambiente para o estado padrão de sucesso
    process.env.ETHEREAL_USER = mockEtherealUser;
    process.env.ETHEREAL_PASS = mockEtherealPass;

    resetTransporterForTesting(); 

  });

  // Limpa as variáveis de ambiente após todos os testes
  afterAll(() => {
    delete process.env.ETHEREAL_USER;
    delete process.env.ETHEREAL_PASS;
  });

  // --- Testes para launchEmailService ---
  it('deve inicializar o serviço de e-mail com sucesso quando as credenciais estão presentes', async () => {
    // Espia console.log para verificar as mensagens
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    await launchEmailService();

    // Verifica se createTransport foi chamado com as credenciais corretas
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: mockEtherealUser,
        pass: mockEtherealPass,
      },
    });

    // Verifica se o método verify foi chamado no transporter mockado
    const mockedTransporter = (nodemailer.createTransport as jest.Mock).mock.results[0].value;
    expect(mockedTransporter.verify).toHaveBeenCalledTimes(1);

    // Verifica a mensagem de log de sucesso
    expect(consoleSpy).toHaveBeenCalledWith("Serviço de e-mail Ethereal conectado com sucesso!");

    consoleSpy.mockRestore(); // Restaura o console.log
  });

  it('não deve inicializar o serviço de e-mail se ETHEREAL_USER estiver ausente', async () => {
    delete process.env.ETHEREAL_USER; // Remove a variável de ambiente
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await launchEmailService();

    // Não deve tentar criar o transporter
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    // Verifica o aviso de log
    expect(consoleSpy).toHaveBeenCalledWith(
      "Variáveis de ambiente ETHEREAL_USER ou ETHEREAL_PASS não configuradas. O serviço de e-mail não será inicializado."
    );

    consoleSpy.mockRestore();
  });

  it('não deve inicializar o serviço de e-mail se ETHEREAL_PASS estiver ausente', async () => {
    delete process.env.ETHEREAL_PASS; // Remove a variável de ambiente
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await launchEmailService();

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Variáveis de ambiente ETHEREAL_USER ou ETHEREAL_PASS não configuradas. O serviço de e-mail não será inicializado."
    );

    consoleSpy.mockRestore();
  });

  it('deve logar um erro se a conexão do transporter falhar', async () => {
    // Configura o mock do createTransport para retornar um transporter cujo verify falha
    (nodemailer.createTransport as jest.Mock).mockImplementationOnce(() => ({
      verify: jest.fn(() => Promise.reject(new Error('Connection failed'))),
      sendMail: jest.fn(), // sendMail ainda precisa existir
    }));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await launchEmailService();

    // Verifica se createTransport foi chamado
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    // Verifica se o erro foi logado
    expect(consoleSpy).toHaveBeenCalledWith(
      "Erro ao conectar ao serviço de e-mail Ethereal:",
      expect.any(Error) // Espera que seja um erro
    );

    consoleSpy.mockRestore();
  });

  // --- Testes para sendWelcomeEmail ---
  it('deve enviar um e-mail de boas-vindas com os dados corretos', async () => {
    // Garante que o serviço de e-mail está inicializado para este teste
    await launchEmailService(); 
    
    // Pega a instância mockada do transporter
    const mockedTransporter = (nodemailer.createTransport as jest.Mock).mock.results[0].value;
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const mockUser: UserPayload = {
      nome: 'Teste User',
      email: 'test@example.com',
      celular: '11987654321',
    };

    await sendWelcomeEmail(mockUser);

    // Verifica se sendMail foi chamado no transporter mockado
    expect(mockedTransporter.sendMail).toHaveBeenCalledTimes(1);
    expect(mockedTransporter.sendMail).toHaveBeenCalledWith({
      from: `"Sua Empresa" <${mockEtherealUser}>`,
      to: mockUser.email,
      subject: `Bem-vindo(a), ${mockUser.nome}! 🎉`,
      text: `Olá ${mockUser.nome},\n\nSeu cadastro em nosso sistema foi realizado com sucesso!\n\nAtenciosamente,\nSua Equipe.`,
      html: `<p>Olá <b>${mockUser.nome}</b>,</p>
             <p>Seu cadastro em nosso sistema foi realizado com sucesso!</p>
             <p>Agradecemos por se juntar a nós.</p>
             <p>Atenciosamente,<br>Sua Equipe.</p>`,
    });

    // Verifica os logs de sucesso
    expect(consoleLogSpy).toHaveBeenCalledWith("E-mail enviado com sucesso para:", mockUser.email);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "URL de visualização do Ethereal:",
      expect.stringContaining("http://ethereal.email/message/mock-message-url")
    );

    consoleLogSpy.mockRestore();
  });

  it('não deve enviar e-mail se o serviço não estiver inicializado', async () => {
    // Não chama launchEmailService para este teste
    // Garante que o transporter esteja nulo no início
    (nodemailer.createTransport as jest.Mock).mockClear(); // Limpa chamadas anteriores
    
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const mockUser: UserPayload = {
      nome: 'Não Enviado',
      email: 'no-send@example.com',
      celular: '11999999999',
    };

    await sendWelcomeEmail(mockUser);

    // Verifica se sendMail NÃO foi chamado
    const mockedTransporter = (nodemailer.createTransport as jest.Mock).mock.results[0]?.value;
    if (mockedTransporter) { // Só verifica se o transporter foi mockado
        expect(mockedTransporter.sendMail).not.toHaveBeenCalled();
    }
    
    // Verifica o log de erro
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Serviço de e-mail não inicializado. Não foi possível enviar e-mail para:",
      mockUser.email
    );

    consoleErrorSpy.mockRestore();
  });

  it('deve logar um erro se o envio de e-mail falhar', async () => {
    // Garante que o serviço de e-mail está inicializado
    await launchEmailService(); 

    // Configura o mock do sendMail para rejeitar a promessa
    const mockedTransporter = (nodemailer.createTransport as jest.Mock).mock.results[0].value;
    mockedTransporter.sendMail.mockImplementationOnce(() => Promise.reject(new Error('Send mail failed')));
    
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const mockUser: UserPayload = {
      nome: 'Erro Envio',
      email: 'error-send@example.com',
      celular: '11888888888',
    };

    await sendWelcomeEmail(mockUser);

    // Verifica se sendMail foi chamado
    expect(mockedTransporter.sendMail).toHaveBeenCalledTimes(1);
    // Verifica se o erro foi logado
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Erro ao enviar e-mail para ${mockUser.email}:`,
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});