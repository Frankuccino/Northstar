// src/types/express.d.ts
import { JwtPayload } from "jsonwebtoken";

export interface AuthPayload extends JwtPayload {
  id: number;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
