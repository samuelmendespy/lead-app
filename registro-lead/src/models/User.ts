import { Schema, model, Document } from 'mongoose';
import { UserPayload } from '../types/user.d';

// Estende Document do Mongoose para incluir _id e outras propriedades
export interface IUser extends UserPayload, Document {}

const UserSchema = new Schema<IUser>({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  celular: { type: String, required: true },
}, {
  timestamps: true // Adiciona campos createdAt e updatedAt automaticamente
});

const User = model<IUser>('User', UserSchema);

export default User;