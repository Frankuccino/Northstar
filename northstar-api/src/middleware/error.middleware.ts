import type { Request, Response, NextFunction } from "express";

// Central error handler. Without this, controllers that call next(err) fall
// through to Express's default HTML error page. We always respond JSON so the
// SPA gets a parseable error. Maps known domain errors to 4xx; everything else
// is 500. Never leaks stack traces in production.
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const message = err instanceof Error ? err.message : "Unknown error";

  // Illegal state-machine transitions, missing entities, etc. -> 4xx.
  const isClientError =
    /not found/i.test(message) ||
    /illegal task transition/i.test(message) ||
    /cannot commit/i.test(message);

  const status = isClientError ? 400 : 500;
  // TODO [G]/[H]: replace console.error with the structured logger once landed.
  console.error(err);

  res.status(status).json({ error: message });
};
