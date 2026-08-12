import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/tokens.js";
import { AuthPayload } from "../types/express.js";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        error: "Invalid token format",
      });
    }

    const decoded = verifyAccessToken(token) as AuthPayload;
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      error: "Invalid token",
    });
  }
};
