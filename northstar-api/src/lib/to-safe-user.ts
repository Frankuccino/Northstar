import { User } from "../types/user.types.js";

export const toSafeUser = (user: User) => {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};
