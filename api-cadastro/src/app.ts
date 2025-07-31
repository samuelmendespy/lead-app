import express from 'express';
import { connectRabbitMQ } from './services/rabbitmqService';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

connectRabbitMQ().then(() => {
  app.use('/api', routes);

  app.listen(PORT, () => {
    console.log(`API de Cadastro rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}/api/users (POST)`);
  });
}).catch(error => {
  console.error('Falha ao iniciar API Cadastro:', error);
  process.exit(1);
});