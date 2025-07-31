import * as amqp from 'amqplib';
import { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { saveUser } from './mongoService';
import { sendWelcomeEmail } from './launchEmailService';
import { UserPayload } from '../types/user';
import { userValidationSchema } from '../schemas/userSchema';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const QUEUE_NAME = 'user_registration_queue';

let connection : ChannelModel | null = null; 
let channel : Channel | null = null; 

export async function startRabbitMQConsumer() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log('Conexão com RabbitMQ estabelecida para consumo!');

    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log(`Aguardando mensagens na fila: ${QUEUE_NAME}`);

    channel.prefetch(1);

    channel.consume(QUEUE_NAME, (msg) => {
      // Verifica se a mensagem não é nula E se o canal existe
      if (msg !== null && channel) { 
        // Adicione 'as ConsumeMessage' para afirmar que msg não é nulo
        processReceivedMessage(msg as ConsumeMessage, channel); 
      } else if (msg === null) {
        console.warn('Mensagem nula recebida do RabbitMQ. Pode ser um sinal de cancelamento da fila.');
      } else {
        console.error('Canal RabbitMQ não disponível ao tentar processar mensagem.');
      }
    }, {
      noAck: false
    });

  } catch (error) {
    console.error('Erro ao iniciar consumidor RabbitMQ:', error);
    process.exit(1);
  }
}

export function getChannel(): Channel | null {
  return channel;
}

export function getConnection(): ChannelModel | null {
  return connection;
}

/**
 * Processa uma única mensagem recebida do RabbitMQ.
 * Esta função contém a lógica principal de consumo.
 * @param msg A mensagem consumida do RabbitMQ.
 * @param currentChannel A instância do canal do RabbitMQ para ACK/NACK.
 */
export async function processReceivedMessage(msg: ConsumeMessage, currentChannel: Channel) {
  if (msg === null) {
    console.warn('Mensagem nula recebida do RabbitMQ.');
    return;
  }

  try {
    const rawUserData: UserPayload = JSON.parse(msg.content.toString());
    console.log('Mensagem recebida do RabbitMQ:', rawUserData);

    const { error, value: userData } = userValidationSchema.validate(rawUserData);

    if (error) {
      console.error('Erro de validação da mensagem:', error.details);
      currentChannel.reject(msg, false); // Rejeita a mensagem se a validação falhar
      return; // Sai da função, não tenta salvar ou enviar e-mail
    }

    const savedUser = await saveUser(userData); // Usa o 'userData' validado

    if (savedUser) {
      await sendWelcomeEmail(userData);
    }

    currentChannel.ack(msg);
    console.log('Mensagem processada e confirmada.');

  } catch (error) {
    // Este catch agora pegará erros de JSON.parse e outros erros inesperados
    console.error('Erro ao processar mensagem (JSON inválido ou erro interno):', error);
    currentChannel.reject(msg, false); 
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