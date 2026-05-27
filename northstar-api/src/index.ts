// Hi let's build my backend
import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import authRoutes from "./routes/auth.routes.js";
import { InferInsertModel } from "drizzle-orm";
import { workerData } from "worker_threads";

type NewUser = InferInsertModel<typeof users>;

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);

app.get("/", (_, res) => {
  res.json({
    message: "Northstar API running",
  });
});

app.get("/db-test", async (_, res) => {
  try {
    const result = await db.execute("SELECT NOW()");

    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Database connection failed",
    });
  }
});

app.get("/users", async (_, res) => {
  const allUsers = await db.select().from(users);

  res.json(allUsers);
});

app.post("/users", async (req, res) => {
  const { email, name } = req.body;

  const newUser = await db
    .insert(users)
    .values({
      email,
      name,
    } as NewUser)
    .returning();
  res.json(newUser);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// we;ll add middlewares later, install zod, morgan, and refactor backend architecture with:
// routes, controllers, services, db, and middleware.
//
//
