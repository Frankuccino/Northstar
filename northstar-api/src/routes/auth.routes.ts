// Routes
import express from "express";
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
  meController,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { authLimiter } from "../middleware/rate-limit.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { registerSchema } from "../schemas/auth.schema.js";

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), registerController);
router.post("/login", authLimiter, loginController);
router.post("/refresh", authLimiter, refreshController); // public; consumes httpOnly cookie
router.post("/logout", logoutController); // revokes the refresh cookie server-side
router.get("/me", authenticate, meController);
router.get("/admin", authenticate, authorize("admin"), (_, res) => {
  res.json({ message: "Welcome Admin" });
});

export default router;
