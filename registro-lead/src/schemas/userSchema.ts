import Joi from 'joi';

export const userValidationSchema = Joi.object({
  nome: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  celular: Joi.string().pattern(/^\d{9,11}$/).required(), // Exemplo: 9 a 11 dígitos
});