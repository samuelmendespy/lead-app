import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Cadastro de Usuários',
      version: '1.0.0',
      description: 'API para registrar novos usuários e enviá-los para um sistema de mensageria.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de Desenvolvimento Local',
      },
    ],
    components: {
      schemas: {
        UserPayload: {
          type: 'object',
          required: ['nome', 'email', 'celular'],
          properties: {
            nome: {
              type: 'string',
              description: 'Nome completo do usuário.',
              example: 'João da Silva',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Endereço de e-mail único do usuário.',
              example: 'joao.silva@example.com',
            },
            celular: {
              type: 'string',
              pattern: '^[0-9]{9}$',
              description: 'Número de celular do usuário (9 dígitos numéricos).',
              example: '912345678',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensagem descritiva do erro.',
              example: 'Por favor, preencha todos os campos.',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;