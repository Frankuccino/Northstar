import app from "./app.js";
import { logger } from "./lib/logger.js";

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  logger.info("Server started", { port: PORT, env: process.env.NODE_ENV });
});
