import "dotenv/config";
import express from "express";

import authRoutes from "./routes/auth.routes.js";
import employeeRoutes from "./routes/employee.routes.js";

import { rateLimiter } from "./middleware/rate-limit.middleware.js";
import { corsOptions } from "./middleware/cors.middleware.js";
import { securityHeaders } from "./middleware/security.middleware.js";

const app = express();

app.use(corsOptions);

app.use(securityHeaders);

app.use(rateLimiter);

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/employees", employeeRoutes);

app.get("/", (_, res) => {
  res.json({
    message: "Northstar API running",
  });
});

export default app;
