import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

// Central error handler. Without this, controllers that call next(err) fall
// through to Express's default HTML error page. We always respond JSON so the
// SPA gets a parseable error. Maps known domain errors to 4xx; everything else
// is 500. Never leaks stack traces to the client.
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const message = err instanceof Error ? err.message : "Unknown error";

  // "Not found" is semantically a 404, not a generic 400 (missing entities,
  // etc.). Forbidden (403) and validation/client errors (400) are separate.
  const isNotFound = /not found/i.test(message);
  const isForbidden = /forbidden/i.test(message);
  const isClientError =
    /illegal task transition/i.test(message) ||
    /wip limit/i.test(message) ||
    /cannot commit/i.test(message);

  const status = isNotFound
    ? 404
    : isClientError
      ? 400
      : 500;
  const finalStatus = isForbidden ? 403 : status;

  // [G] Structured logging. The stack is captured server-side only (never sent
  // to the client). A correlation id lets the client relay the exact failure
  // to support without exposing internals.
  const errorId = logger.newErrorId();
  logger.error("Unhandled error", {
    status: finalStatus,
    errorId,
    error: err instanceof Error ? err : undefined,
    path: _req.path,
    method: _req.method,
  });

  // Client gets the safe message + correlation id, never the stack.
  res.status(finalStatus).json({ error: message, errorId });
};
