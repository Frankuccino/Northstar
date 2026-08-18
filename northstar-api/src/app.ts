import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";

import { rateLimiter } from "./middleware/rate-limit.middleware.js";
import { corsOptions } from "./middleware/cors.middleware.js";
import { securityHeaders } from "./middleware/security.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.set("trust proxy", 1);

app.use(corsOptions);

app.use(securityHeaders);

app.use(rateLimiter);

app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/employees", employeeRoutes);
app.use("/workspace", workspaceRoutes);

app.get("/", (_, res) => {
  res.json({
    message: "Northstar API running",
  });
});

// Central error handler must be registered last so it catches everything above.
app.use(errorHandler);

export default app;
