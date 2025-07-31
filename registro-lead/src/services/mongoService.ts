import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import { UserPayload } from '../types/user.d';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/userdb';

export async function connectMongoDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Conectado ao MongoDB com sucesso!');
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
    process.exit(1); // Encerra a aplicação se não conseguir conectar
  }
}

export async function saveUser(userData: UserPayload): Promise<IUser | null> {
  try {
    const newUser = new User(userData);
    await newUser.save();
    console.log('Usuário salvo no MongoDB:', newUser.email);
    return newUser;
  } catch (error: any) {
    if (error.code === 11000) { // Erro de chave duplicada (email único)
      console.warn(`Usuário com email ${userData.email} já existe.`);
      // Você pode optar por retornar null, o usuário existente, ou lançar um erro específico
      return null;
    }
    console.error('Erro ao salvar usuário no MongoDB:', error);
    throw error;
  }
}

// Garante que a conexão seja fechada ao encerrar a aplicação
process.on('beforeExit', async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    console.log('Conexão com MongoDB fechada.');
  }
});