import { Request, Response } from 'express';
import Joi from 'joi';
import { publishUser } from '../services/rabbitmqService';
import { UserPayload } from '../types/user.d';

// Esquema de validação com Joi
const userSchema = Joi.object<UserPayload>({
  nome: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  celular: Joi.string().pattern(/^\d{9}$/).required(),
});

export async function registerUser(req: Request, res: Response) {
  try {
    // Valida os dados da requisição
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