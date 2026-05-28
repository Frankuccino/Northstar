// Register Controller | Login Controller | Me Controller (protected route)
import { login, register } from "../services/auth.service.js";
import { Request, Response, NextFunction } from "express";

export const registerController = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    const user = await register(email, password, name);

    const { password: _, ...safeUser } = user;
    return res.status(201).json(safeUser);
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(400).json({ error: "An unknown error occured" });
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await login(email, password);

    return res.json(result);
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(400).json({ error: "An unknown error occured" });
  }
};

export const meController = (req: Request, res: Response) => {
  return res.json((req as any).user);
};
