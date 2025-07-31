import amqp from 'amqplib';
import { UserPayload } from '../types/user.d';
import { saveUser } from './mongoService';
import { sendWelcomeEmail } from './emailService';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const QUEUE_NAME = 'user_registration_queue';

let connection = await amqp.connect('');
let channel = await connection.createChannel();

export async function startRabbitMQConsumer() {
  try {
    
    console.log('Conectado ao RabbitMQ para consumo!');

    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log(`Aguardando mensagens na fila: ${QUEUE_NAME}`);

    channel.prefetch(1);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        try {
          const userData: UserPayload = JSON.parse(msg.content.toString());
          console.log('Mensagem recebida do RabbitMQ:', userData);

          const savedUser = await saveUser(userData);

          if (savedUser) {
            await sendWelcomeEmail(userData);
          }

          channel.ack(msg);
          console.log('Mensagem processada e confirmada.');

        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
          channel.reject(msg, false);
        }
      }
    }, {
      noAck: false
    });

  } catch (error) {
    console.error('Erro ao iniciar consumidor RabbitMQ:', error);
    process.exit(1);
  }
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
      console.log('Conexão com RabbitMQ fechada (consumidor).');
    } catch (e) {
      console.error('Erro ao fechar conexão RabbitMQ:', e);
    }
  }
});