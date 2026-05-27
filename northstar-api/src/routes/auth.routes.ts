// Routes
import express from "express";
import {
  registerController,
  loginController,
  meController,
} from "../controllers/auth.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.get("/me", authMiddleware, meController);
router.get("/admin", authMiddleware, requireRole("admin"), (_, res) => {
  res.json({ message: "Welcome Admin" });
});

const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwiZW1haWwiOiJmcmVzaEBub3J0aHN0YXIuY29tIiwicm9sZSI6ImVtcGxveWVlIiwiaWF0IjoxNzc5ODkyMTc4LCJleHAiOjE3Nzk5Nzg1Nzh9.Jz48cgTtxiZ0UiUlskOvpSCDZN5ngL7vK1C3OupgvHs";
console.log(token);

export default router;

// the middleware works !
//
