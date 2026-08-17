// src/types/express.d.ts
import { JwtPayload } from "jsonwebtoken";
import type { Role } from "./role.js";

export interface AuthPayload extends JwtPayload {
  id: number;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
