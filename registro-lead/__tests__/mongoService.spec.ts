import mongoose from 'mongoose';
import User from '../src/models/User';
import { connectMongoDB, saveUser } from '../src/services/mongoService';
import { UserPayload } from '../src/types/user';

// --- Mocks para Mongoose ---
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  connection: { readyState: 0 },
  Schema: jest.fn(),
  model: jest.fn(),
}));

// --- Mock para o Modelo User (Forma Recomendada) ---
// 💡 Crie o mock para o método 'save' em uma variável que possamos acessar nos testes.
const mockSave = jest.fn();

// Agora, o mock do User retorna uma instância que usa o mockSave.
jest.mock('../src/models/User', () => {
  return jest.fn().mockImplementation((data: UserPayload) => {
    // A instância mockada agora tem os dados e o método save mockado.
    return {
      ...data,
      save: mockSave,
    };
  });
});

// ✅ Converte o tipo de User para jest.Mock para que o TypeScript entenda.
const mockedUser = User as unknown as jest.Mock;

describe('MongoDB Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mongoose.connection as any).readyState = 0;
  });

  // --- Testes para connectMongoDB (sem alterações) ---
  describe('connectMongoDB', () => {
    it('deve conectar ao MongoDB com sucesso', async () => {
      (mongoose.connect as jest.Mock).mockResolvedValueOnce(true);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await connectMongoDB();

      expect(mongoose.connect).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Conectado ao MongoDB com sucesso!');
      consoleSpy.mockRestore();
    });

    it('deve logar um erro e sair do processo se a conexão falhar', async () => {
      const mockError = new Error('Connection failed');
      (mongoose.connect as jest.Mock).mockRejectedValueOnce(mockError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);

      await connectMongoDB();

      expect(mongoose.connect).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Erro ao conectar ao MongoDB:', mockError);
      expect(processExitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });

  // --- Testes para saveUser (Atualizados) ---
  describe('saveUser', () => {
    const mockUserData: UserPayload = {
      nome: 'Teste Save',
      email: 'save@example.com',
      celular: '11987654321',
    };

    it('deve salvar um novo usuário com sucesso', async () => {
      // ✅ Agora podemos mockar a resolução diretamente no mockSave.
      mockSave.mockResolvedValueOnce(mockUserData);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const savedUser = await saveUser(mockUserData);

      // Verifica se o construtor mockado foi chamado corretamente.
      expect(mockedUser).toHaveBeenCalledTimes(1);
      expect(mockedUser).toHaveBeenCalledWith(mockUserData);
      // Verifica se o método save foi chamado.
      expect(mockSave).toHaveBeenCalledTimes(1);
      // Verifica o retorno e o log.
      expect(savedUser).toEqual(expect.objectContaining(mockUserData));
      expect(consoleSpy).toHaveBeenCalledWith('Usuário salvo no MongoDB:', mockUserData.email);
      consoleSpy.mockRestore();
    });

    it('deve retornar null e logar um aviso se o email já existe (código 11000)', async () => {
      const duplicateKeyError = new Error('Duplicate key error');
      (duplicateKeyError as any).code = 11000;
      // ✅ Mocka a rejeição diretamente no mockSave.
      mockSave.mockRejectedValueOnce(duplicateKeyError);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const savedUser = await saveUser(mockUserData);

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(savedUser).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Usuário com email ${mockUserData.email} já existe.`);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('deve logar um erro e relançar a exceção para outros erros de salvamento', async () => {
      const genericError = new Error('Generic save error');
      // ✅ Mocka a rejeição diretamente no mockSave.
      mockSave.mockRejectedValueOnce(genericError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(saveUser(mockUserData)).rejects.toThrow(genericError);

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Erro ao salvar usuário no MongoDB:', genericError);
      consoleErrorSpy.mockRestore();
    });
  });
});