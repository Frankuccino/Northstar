import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import authRoutes from "./routes/auth.routes.js";
import { InferInsertModel } from "drizzle-orm";
import employeeRoutes from "./routes/employee.routes.js";

type NewUser = InferInsertModel<typeof users>;

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/employees", employeeRoutes);

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

export default app;
