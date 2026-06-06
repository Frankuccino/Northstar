import cors from "cors";

export const corsOptions = cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
});
