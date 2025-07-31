import 'dotenv/config';
import { connectMongoDB } from './services/mongoService';
import { startRabbitMQConsumer } from './services/rabbitmqConsumerService';
import { launchEmailService } from './services/launchEmailService';

async function bootstrap() {
  await connectMongoDB();
  await launchEmailService();
  await startRabbitMQConsumer();
}

bootstrap().catch(error => {
  console.error('Falha ao iniciar Registro Lead:', error);
  process.exit(1);
});