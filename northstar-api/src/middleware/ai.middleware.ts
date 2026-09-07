import { Request, Response, NextFunction } from "express";
import { verifyAiClient } from "../services/ai.service.js";

export const aiAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const apiKey = String(req.headers["x-ai-api-key"] ?? "");
    if (!apiKey) {
      return res.status(401).json({ error: "Missing AI API key" });
    }

    const client = await verifyAiClient(apiKey);
    (req as any).aiClient = client;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid AI client credentials" });
  }
};
