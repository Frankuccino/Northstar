import { Request, Response, NextFunction } from "express";

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: "Forbidden",
      });
    }
    next();
  };
};
// So basically we authorize first the user using the JWT token, then we do Authorization through the roles.
// The role that can be accessed is passed in the variable as an argument.
