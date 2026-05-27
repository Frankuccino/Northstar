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

export default router;

// the middleware works !
//
