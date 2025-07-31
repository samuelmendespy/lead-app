import { Request, Response } from 'express';
import Joi from 'joi';
import { publishUser } from '../services/rabbitmqService';
import { UserPayload } from '../types/user.d';

const userSchema = Joi.object<UserPayload>({
  nome: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  celular: Joi.string().pattern(/^\d{9}$/).required(),
});

/**
 * @swagger
 * /api/users:
 * post:
 * summary: Registra um novo usuário.
 * description: Envia os dados de um novo usuário para uma fila de processamento assíncrono.
 * tags:
 * - Usuários
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/UserPayload' # Referencia o schema UserPayload definido no swaggerConfig.ts
 * responses:
 * 202:
 * description: Usuário recebido e enviado para processamento com sucesso.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: 'Usuário recebido e enviado para processamento.'
 * data:
 * type: object
 * properties:
 * nome:
 * type: string
 * example: 'João da Silva'
 * email:
 * type: string
 * example: 'joao.silva@example.com'
 * 400:
 * description: Dados de entrada inválidos.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse' # Referencia o schema ErrorResponse
 * 500:
 * description: Erro interno no servidor.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 */
export async function registerUser(req: Request, res: Response) {
  try {
    const { error, value } = userSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const userData: UserPayload = value;

    await publishUser(userData);

    return res.status(202).json({
      message: 'Usuário recebido e enviado para processamento.',
      data: { nome: userData.nome, email: userData.email }
    });

  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return res.status(500).json({ message: 'Erro interno no servidor ao processar sua solicitação.' });
  }
}