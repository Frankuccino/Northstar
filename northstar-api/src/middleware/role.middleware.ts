import { Request, Response, NextFunction } from "express";
import type { AuthPayload } from "../types/express.js";
import { isRole, type Role } from "../types/role.js";

// Authorizes a route by role. The JWT is already verified by `authenticate`,
// so here we only check the decoded role is a real Role and is permitted.
export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthPayload | undefined;

    // 401 if no authenticated user or a malformed/forged role claim.
    if (!user || !isRole(user.role)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
};
