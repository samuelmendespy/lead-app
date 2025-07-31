// Mock dos serviços externos
jest.mock('../src/services/rabbitmqConsumerService', () => {
  // Obtém as implementações reais do módulo
  const originalModule = jest.requireActual('../src/services/rabbitmqConsumerService');
  return {
    ...originalModule, // Exporta tudo que é real
    // Mas sobrescreve ou adiciona mocks para o que precisamos
    getChannel: jest.fn(() => ({
      ack: jest.fn(),
      reject: jest.fn(),
    })),
    startRabbitMQConsumer: jest.fn(() => Promise.resolve()),
    // processReceivedMessage será a implementação real que queremos testar,
    // então não a colocamos aqui, ela já virá do originalModule.
  };
});

// Mock do serviço MongoDB
jest.mock('../src/services/mongoService', () => ({
  saveUser: jest.fn(() => Promise.resolve({
    _id: 'mockUserId123',
    nome: 'Mock User',
    email: 'mock@example.com',
    celular: '123456789',
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
}));

// Mock do serviço de E-mail
jest.mock('../src/services/launchEmailService', () => ({
  sendWelcomeEmail: jest.fn(() => Promise.resolve()),
}));

// Importa a função que realmente queremos testar
import { processReceivedMessage, getChannel } from '../src/services/rabbitmqConsumerService';
import { saveUser } from '../src/services/mongoService';
import { sendWelcomeEmail } from '../src/services/launchEmailService';

// Importa tipos necessários (se não estiverem disponíveis globalmente do @types/amqplib)
import { ConsumeMessage, Channel } from 'amqplib'; 

describe('RabbitMQ Message Processor (processReceivedMessage)', () => {
  // Para manter uma referência ao objeto mockado do canal
  let mockChannel: jest.Mocked<Channel>;

  beforeEach(() => {
    // Limpa todas as chamadas anteriores e instâncias de mocks
    jest.clearAllMocks();
    // Garante que a instância do canal mockado seja resetada para cada teste
    mockChannel = getChannel() as jest.Mocked<Channel>; 
  });

  it('deve processar uma mensagem de usuário válida, salvar no DB, enviar e-mail e confirmar (ack)', async () => {
    const mockUserPayload = {
      nome: 'Usuário Teste',
      email: 'teste@dominio.com',
      celular: '987654321',
    };
    // Simula uma mensagem do RabbitMQ
    const mockMessage: ConsumeMessage = {
      content: Buffer.from(JSON.stringify(mockUserPayload)),
      fields: { deliveryTag: 1, redelivered: false, exchange: '', routingKey: '' },
      properties: { contentType: 'application/json', contentEncoding: 'utf-8' },
    } as ConsumeMessage; // 'as ConsumeMessage' para garantir que o tipo esteja correto

    // Chama a função diretamente
    await processReceivedMessage(mockMessage, mockChannel);

    // Verifica se o usuário foi salvo no banco de dados
    expect(saveUser).toHaveBeenCalledTimes(1);
    expect(saveUser).toHaveBeenCalledWith(mockUserPayload);

    // Verifica se o e-mail de boas-vindas foi enviado
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(sendWelcomeEmail).toHaveBeenCalledWith(mockUserPayload); // Assumindo que sendWelcomeEmail recebe UserPayload

    // Verifica se a mensagem foi reconhecida (ACK) no RabbitMQ
    expect(mockChannel.ack).toHaveBeenCalledTimes(1);
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    expect(mockChannel.reject).not.toHaveBeenCalled(); // Garante que não foi rejeitada
  });

  it('não deve processar mensagens com JSON inválido e deve rejeitá-las (reject)', async () => {
    const invalidMessage: ConsumeMessage = {
      content: Buffer.from('{"nome": "Teste", "email": "email.com", "celular": "123"}'), // JSON válido, mas inválido para o Joi
      fields: { deliveryTag: 2, redelivered: false, exchange: '', routingKey: '' },
      properties: { contentType: 'application/json', contentEncoding: 'utf-8' },
    } as ConsumeMessage;

    await processReceivedMessage(invalidMessage, mockChannel);

    // Não deve tentar salvar ou enviar e-mail
    expect(saveUser).not.toHaveBeenCalled();
    expect(sendWelcomeEmail).not.toHaveBeenCalled();

    // Deve ser rejeitada
    expect(mockChannel.reject).toHaveBeenCalledTimes(1);
    expect(mockChannel.reject).toHaveBeenCalledWith(invalidMessage, false); // 'false' indica para não fazer requeue
    expect(mockChannel.ack).not.toHaveBeenCalled();
  });

  it('deve lidar com erros durante o salvamento no DB e rejeitar a mensagem', async () => {
    const mockUserPayload = {
      nome: 'Usuário Erro DB',
      email: 'errodb@dominio.com',
      celular: '912345678',
    };
    const mockMessage: ConsumeMessage = {
      content: Buffer.from(JSON.stringify(mockUserPayload)),
      fields: { deliveryTag: 3, redelivered: false, exchange: '', routingKey: '' },
      properties: { contentType: 'application/json', contentEncoding: 'utf-8' },
    } as ConsumeMessage;

    // Configura o mock do saveUser para lançar um erro
    (saveUser as jest.Mock).mockImplementationOnce(() => {
      throw new Error('MongoDB save failed');
    });

    await processReceivedMessage(mockMessage, mockChannel);

    // Deve tentar salvar, mas falhar
    expect(saveUser).toHaveBeenCalledTimes(1);
    expect(saveUser).toHaveBeenCalledWith(mockUserPayload);

    // Não deve tentar enviar e-mail se o save falhou
    expect(sendWelcomeEmail).not.toHaveBeenCalled();

    // Deve ser rejeitada
    expect(mockChannel.reject).toHaveBeenCalledTimes(1);
    expect(mockChannel.reject).toHaveBeenCalledWith(mockMessage, false);
    expect(mockChannel.ack).not.toHaveBeenCalled();
  });

  it('deve lidar com erros durante o envio de e-mail e rejeitar a mensagem', async () => {
    const mockUserPayload = {
      nome: 'Usuário Erro Email',
      email: 'erroemail@dominio.com',
      celular: '912345678',
    };
    const mockMessage: ConsumeMessage = {
      content: Buffer.from(JSON.stringify(mockUserPayload)),
      fields: { deliveryTag: 4, redelivered: false, exchange: '', routingKey: '' },
      properties: { contentType: 'application/json', contentEncoding: 'utf-8' },
    } as ConsumeMessage;

    // Configura o mock do sendWelcomeEmail para lançar um erro
    (sendWelcomeEmail as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Email sending failed');
    });

    await processReceivedMessage(mockMessage, mockChannel);

    // Deve salvar no DB
    expect(saveUser).toHaveBeenCalledTimes(1);
    expect(saveUser).toHaveBeenCalledWith(mockUserPayload);

    // Deve tentar enviar e-mail, mas falhar
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(sendWelcomeEmail).toHaveBeenCalledWith(mockUserPayload);

    // Deve ser rejeitada
    expect(mockChannel.reject).toHaveBeenCalledTimes(1);
    expect(mockChannel.reject).toHaveBeenCalledWith(mockMessage, false);
    expect(mockChannel.ack).not.toHaveBeenCalled();
  });

  it('não deve processar mensagens nulas', async () => {
    const mockMessage: ConsumeMessage = null as any; // Simula uma mensagem nula

    await processReceivedMessage(mockMessage, mockChannel);

    // Nenhuma operação deve ser realizada
    expect(saveUser).not.toHaveBeenCalled();
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
    expect(mockChannel.ack).not.toHaveBeenCalled();
    expect(mockChannel.reject).not.toHaveBeenCalled();
  });
});