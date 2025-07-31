import nodemailer from 'nodemailer';
import { UserPayload } from '../types/user';

// Credenciais do Ethereal
const ETHEREAL_USER = process.env.ETHEREAL_USER;
const ETHEREAL_PASS = process.env.ETHEREAL_PASS;

let transporter: nodemailer.Transporter;

export async function launchEmailService() {
  if (!ETHEREAL_USER || !ETHEREAL_PASS) {
    console.warn('Variáveis de ambiente ETHEREAL_USER ou ETHEREAL_PASS não configuradas. O serviço de e-mail não será inicializado.');
    // Você pode escolher sair do processo ou apenas logar um aviso
    return;
  }

  try {
    // Crie um "transporter" Nodemailer usando as credenciais do Ethereal
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true para 465, false para outras portas como 587
      auth: {
        user: ETHEREAL_USER,
        pass: ETHEREAL_PASS,
      },
    });

    // Verifique a conexão
    await transporter.verify();
    console.log('Serviço de e-mail Ethereal conectado com sucesso!');

  } catch (error) {
    console.error('Erro ao conectar ao serviço de e-mail Ethereal:', error);
    // Se o serviço de e-mail for crítico, você pode considerar encerrar a aplicação aqui.
    // Por enquanto, apenas logamos o erro.
  }
}

export async function sendWelcomeEmail(user: UserPayload): Promise<void> {
  if (!transporter) {
    console.error('Serviço de e-mail não inicializado. Não foi possível enviar e-mail para:', user.email);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Sua Empresa" <${ETHEREAL_USER}>`, // Remetente
      to: user.email, // Lista de destinatários
      subject: `Bem-vindo(a), ${user.nome}! 🎉`, // Assunto
      text: `Olá ${user.nome},\n\nSeu cadastro em nosso sistema foi realizado com sucesso!\n\nAtenciosamente,\nSua Equipe.`, // Corpo do e-mail em texto puro
      html: `<p>Olá <b>${user.nome}</b>,</p>
             <p>Seu cadastro em nosso sistema foi realizado com sucesso!</p>
             <p>Agradecemos por se juntar a nós.</p>
             <p>Atenciosamente,<br>Sua Equipe.</p>`, // Corpo do e-mail em HTML
    });

    console.log('E-mail enviado com sucesso para:', user.email);
    console.log('URL de visualização do Ethereal:', nodemailer.getTestMessageUrl(info)); // URL para ver o e-mail no Ethereal

  } catch (error) {
    console.error(`Erro ao enviar e-mail para ${user.email}:`, error);
  }
}