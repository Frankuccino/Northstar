import cors from "cors";
import type { CorsRequest } from "cors";

// Allow a comma-separated list of trusted origins (e.g. Vercel + localhost).
// An exact match is required because credentials:true forbids the "*" wildcard.
// If CLIENT_URL is unset, we reflect the request origin (dev convenience) so
// local/dev aren't blocked — tighten this in production by always setting it.
const allowedOrigins = (process.env.CLIENT_URL ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const corsOptions = cors({
  origin: (reqOrigin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    // Server-to-server / no Origin header (curl, health checks, Render probe).
    if (!reqOrigin) return cb(null, true);
    if (allowedOrigins.length === 0) return cb(null, true);
    if (allowedOrigins.includes(reqOrigin)) return cb(null, true);
    cb(new Error(`CORS: origin ${reqOrigin} not allowed`));
  },
  credentials: true,
});
