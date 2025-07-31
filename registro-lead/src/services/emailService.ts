import { UserPayload } from '../types/user';

export async function sendWelcomeEmail(user: UserPayload): Promise<void> {
  console.log(`--- SIMULANDO ENVIO DE E-MAIL ---`);
  console.log(`Para: ${user.email}`);
  console.log(`Assunto: Bem-vindo(a), ${user.nome}!`);
  console.log(`Corpo: Olá ${user.nome}, seu cadastro foi realizado com sucesso!`);
  console.log(`---------------------------------`);
  // Em um ambiente real, aqui você integraria com um serviço de e-mail (SendGrid, Mailgun, Nodemailer, etc.)
  return Promise.resolve(); // Simula uma operação assíncrona
}