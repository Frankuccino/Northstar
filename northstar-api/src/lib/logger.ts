// Zero-dependency structured logger (defect [G]).
//
// Why not pino/winston? Scope. This is the audit-trail primitive the error
// handler needs: levels, timestamps, and machine-parseable output. Pulling a
// full logging framework would be over-engineering for this stage. Swap the
// `emit` function for a transport (pino/OTel) later without touching callers.
//
// Output shape:
//   prod (NODE_ENV=production): single-line JSON  -> {"ts":"...","level":"error",...}
//   dev:                        human line         -> 2026-08-20T22:00:00Z error Unhandled error ...

import { randomUUID } from "node:crypto";

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const envLevel = (process.env.LOG_LEVEL as Level | undefined)?.toLowerCase();
const minLevel: Level =
  envLevel && envLevel in LEVEL_ORDER ? (envLevel as Level) : "info";

const isProd = process.env.NODE_ENV === "production";

type Meta = Record<string, unknown> & { error?: unknown };

function emit(level: Level, message: string, meta: Meta = {}) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;

  // Never log the stack in the message field; surface it only as structured
  // metadata, and only server-side (it must never reach the client response).
  const { error, ...rest } = meta;
  const stack = error instanceof Error ? error.stack : undefined;

  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...rest,
    ...(stack ? { stack } : {}),
  };

  const out = isProd
    ? JSON.stringify(entry)
    : `${entry.ts} ${level} ${message}${Object.keys(rest).length ? " " + JSON.stringify(rest) : ""}`;

  // Errors go to stderr so they're not mixed with stdout request logs.
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

export const logger = {
  debug: (message: string, meta?: Meta) => emit("debug", message, meta),
  info: (message: string, meta?: Meta) => emit("info", message, meta),
  warn: (message: string, meta?: Meta) => emit("warn", message, meta),
  error: (message: string, meta?: Meta) => emit("error", message, meta),
  // Stable correlation id for client<->server error tracing.
  newErrorId: () => randomUUID(),
};
