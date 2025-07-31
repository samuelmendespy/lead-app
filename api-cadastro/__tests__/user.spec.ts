import request from 'supertest';
import express from 'express';
import { publishUser } from '../src/services/rabbitmqService';
import userRoutes from '../src/routes/routes';

// Mock do serviço RabbitMQ
// Isso garante que `publishUser` não tente realmente se conectar ao RabbitMQ durante o teste
jest.mock('../src/services/rabbitmqService', () => ({
  publishUser: jest.fn(), // Cria uma função mockável
}));

// Mock da conexão inicial do RabbitMQ para o app.ts
// Para que o app.ts não tente conectar no Jest, podemos mockar o módulo inteiro
jest.mock('../src/services/rabbitmqService', () => ({
  ...jest.requireActual('../src/services/rabbitmqService'), // Mantenha as outras exports reais se houver
  connectRabbitMQ: jest.fn(() => Promise.resolve()), // Mocka connectRabbitMQ para resolver com sucesso
  publishUser: jest.fn(), // Continua mockando publishUser
}));


// Cria uma instância mínima do Express para testar as rotas
const app = express();
app.use(express.json()); // Importante para o parsing do corpo JSON
app.use('/api', userRoutes); // Monta suas rotas no caminho /api

describe('User Registration API', () => {
  // Limpa os mocks antes de cada teste
  beforeEach(() => {
    (publishUser as jest.Mock).mockClear(); // Limpa chamadas anteriores
  });

  it('should register a user successfully and publish to RabbitMQ', async () => {
    const userData = {
      nome: 'Teste Jest',
      email: 'teste.jest@example.com',
      celular: '987654321',
    };

    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(202); // Espera um status 202 (Accepted)

    // Verifica a resposta da API
    expect(response.body).toEqual({
      message: 'Usuário recebido e enviado para processamento.',
      data: { nome: userData.nome, email: userData.email },
    });

    // Verifica se a função publishUser foi chamada com os dados corretos
    expect(publishUser).toHaveBeenCalledTimes(1);
    expect(publishUser).toHaveBeenCalledWith(userData);
  });

  it('should return 400 if validation fails (e.g., missing name)', async () => {
    const invalidUserData = {
      email: 'invalid@example.com',
      celular: '912345678',
    };

    const response = await request(app)
      .post('/api/users')
      .send(invalidUserData)
      .expect(400); // Espera um status 400 (Bad Request)

    // Verifica a mensagem de erro
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('nome'); // A mensagem deve mencionar o campo 'nome'

    // Garante que publishUser NÃO foi chamada
    expect(publishUser).not.toHaveBeenCalled();
  });

  it('should return 400 if validation fails (e.g., invalid email)', async () => {
    const invalidUserData = {
      nome: 'Teste Email',
      email: 'invalid-email', // E-mail inválido
      celular: '912345678',
    };

    const response = await request(app)
      .post('/api/users')
      .send(invalidUserData)
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('email');
    expect(publishUser).not.toHaveBeenCalled();
  });

  it('should return 400 if validation fails (e.g., invalid cellphone format)', async () => {
    const invalidUserData = {
      nome: 'Teste Celular',
      email: 'valid@example.com',
      celular: '123', // Celular inválido
    };

    const response = await request(app)
      .post('/api/users')
      .send(invalidUserData)
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('celular');
    expect(publishUser).not.toHaveBeenCalled();
  });

  // Teste para simular um erro interno no publishUser (ex: RabbitMQ indisponível)
  it('should return 500 if an internal error occurs during publishing', async () => {
    // Configura o mock de publishUser para lançar um erro
    (publishUser as jest.Mock).mockImplementationOnce(() => {
      throw new Error('RabbitMQ connection error during test');
    });

    const userData = {
      nome: 'Teste Erro',
      email: 'teste.erro@example.com',
      celular: '999999999',
    };

    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(500); // Espera um status 500

    expect(response.body).toEqual({
      message: 'Erro interno no servidor ao processar sua solicitação.',
    });
    expect(publishUser).toHaveBeenCalledTimes(1); // Ainda assim foi chamada
  });
});