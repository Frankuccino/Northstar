import { rateLimit } from "express-rate-limit";

// Tests run with SKIP_RATE_LIMIT=true so the limiter never fires during the suite.
const skipInTests = () => process.env.SKIP_RATE_LIMIT === "true";

// Global, generous limiter applied to every route (defense-in-depth baseline).
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  skip: skipInTests,
});

// Dedicated, strict limiter for credential endpoints (defect [C]). Login,
// refresh, and register are the highest-value targets for brute force and
// credential stuffing, so they get a much tighter per-IP cap on top of the
// global limiter. Keyed by IP; respects X-Forwarded-For via trust proxy.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  skip: skipInTests,
  message: { error: "Too many authentication attempts, please try again later." },
});
