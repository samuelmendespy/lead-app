import * as amqp from 'amqplib';
import { Channel, ChannelModel } from 'amqplib';
import { UserPayload } from '../types/user.d';

let connection : ChannelModel;
let channel : Channel;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

export async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log('Conexão producer com RabbitMQ!');

    await channel.assertQueue('user_registration_queue', { durable: true });
  } catch (error) {
    console.error('Erro ao conectar ou configurar RabbitMQ:', error);
    process.exit(1);
  }
}

export async function publishUser(user: UserPayload) {
  if (!channel) {
    throw new Error('Canal do RabbitMQ não está conectado.');
  }

  const message = JSON.stringify(user);
  channel.sendToQueue('user_registration_queue', Buffer.from(message), { persistent: true });
  console.log('Mensagem de usuário enviada para o RabbitMQ:', user);
}

process.on('beforeExit', async () => {
  if (channel) {
    try {
      await channel.close();
      console.log('Canal do RabbitMQ fechado.');
    } catch (e) {
      console.error('Erro ao fechar canal do RabbitMQ:', e);
    }
  }
  if (connection) {
    try {
      await connection.close();
      console.log('Conexão com RabbitMQ fechada.');
    } catch (e) {
      console.error('Erro ao fechar conexão RabbitMQ:', e);
    }
  }
});