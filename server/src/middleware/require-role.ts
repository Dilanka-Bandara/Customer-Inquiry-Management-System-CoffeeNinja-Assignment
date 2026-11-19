// Use AFTER requireAuth: allows the request only for the given role(s), otherwise 403.
import type { RequestHandler } from "express";
import { AppError } from "../lib/errors";
import type { PublicUser } from "../modules/auth/auth.service";

export function requireRole(...roles: PublicUser["role"][]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError("FORBIDDEN", "You do not have permission to do this");
    }
    next();
  };
}
