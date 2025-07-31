import nodemailer from "nodemailer";
import { UserPayload } from "../types/user";

let transporter: nodemailer.Transporter | null = null;

export async function launchEmailService() {
  const ETHEREAL_USER = process.env.ETHEREAL_USER;
  const ETHEREAL_PASS = process.env.ETHEREAL_PASS;

  if (!ETHEREAL_USER || !ETHEREAL_PASS) {
    console.warn(
      "Variáveis de ambiente ETHEREAL_USER ou ETHEREAL_PASS não configuradas. O serviço de e-mail não será inicializado."
    );
    return;
  }

  try {
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: ETHEREAL_USER,
        pass: ETHEREAL_PASS,
      },
    });

    await transporter.verify();
    console.log("Serviço de e-mail Ethereal conectado com sucesso!");
  } catch (error) {
    console.error("Erro ao conectar ao serviço de e-mail Ethereal:", error);
  }
}

export async function sendWelcomeEmail(user: UserPayload): Promise<void> {
  if (!transporter) {
    console.error(
      "Serviço de e-mail não inicializado. Não foi possível enviar e-mail para:",
      user.email
    );
    return;
  }

  const ETHEREAL_USER = process.env.ETHEREAL_USER;
  
  try {
    const info = await transporter.sendMail({
      from: `"Sua Empresa" <${ETHEREAL_USER}>`,
      to: user.email, // Lista de destinatários
      subject: `Bem-vindo(a), ${user.nome}! 🎉`,
      text: `Olá ${user.nome},\n\nSeu cadastro em nosso sistema foi realizado com sucesso!\n\nAtenciosamente,\nSua Equipe.`, // Corpo do e-mail em texto puro
      html: `<p>Olá <b>${user.nome}</b>,</p>
             <p>Seu cadastro em nosso sistema foi realizado com sucesso!</p>
             <p>Agradecemos por se juntar a nós.</p>
             <p>Atenciosamente,<br>Sua Equipe.</p>`,
    });

    console.log("E-mail enviado com sucesso para:", user.email);
    console.log(
      "URL de visualização do Ethereal:",
      nodemailer.getTestMessageUrl(info)
    );
  } catch (error) {
    console.error(`Erro ao enviar e-mail para ${user.email}:`, error);
  }
}

/**
 * Função auxiliar para resetar o transporter para fins de teste.
 * Não deve ser usada em código de produção.
 */
export const resetTransporterForTesting = (): void => {
  transporter = null;
};