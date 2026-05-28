// Routes
import express from "express";
import {
  registerController,
  loginController,
  meController,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.get("/me", authenticate, meController);
router.get("/admin", authenticate, authorize("admin"), (_, res) => {
  res.json({ message: "Welcome Admin" });
});

export default router;

// the middleware works !
//
