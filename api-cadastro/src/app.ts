import 'dotenv/config';
import express from "express";
import { connectRabbitMQ } from "./services/rabbitmqService";
import routes from "./routes/routes";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swaggerConfig";

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações para API

// Middleware para habilitar CORS
app.use(cors());

// Middleware para fazer o parsing do corpo da requisição em JSON
app.use(express.json());

// Rotas da API
app.use("/api", routes);

// --- Adição para a rota do Swagger UI ---
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

connectRabbitMQ()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API de Cadastro rodando na porta ${PORT}`);
      console.log(`Acesse: http://localhost:${PORT}/api/users (POST)`);
    });
  })
  .catch((error) => {
    console.error("Falha ao iniciar API Cadastro:", error);
    process.exit(1);
  });
