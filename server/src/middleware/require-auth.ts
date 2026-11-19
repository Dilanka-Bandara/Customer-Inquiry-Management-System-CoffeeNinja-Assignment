// Gatekeeper for protected routes. Runs BEFORE the route handler.
// No valid login cookie -> 401, and the route handler never runs.
import type { RequestHandler } from "express";
import { prisma } from "../db";
import { AppError } from "../lib/errors";
import { publicUserSelect, readUserIdFromToken } from "../modules/auth/auth.service";

export const AUTH_COOKIE = "inquiry_session";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const userId = readUserIdFromToken(req.cookies?.[AUTH_COOKIE]);
  if (!userId) {
    throw new AppError("UNAUTHENTICATED", "Please sign in to continue");
  }

  // Load the user fresh from the database on every request, so a deleted user
  // or a changed role takes effect immediately (the token only stores the id).
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) {
    throw new AppError("UNAUTHENTICATED", "Your account is no longer available. Please sign in again");
  }

  req.user = user;
  next();
};

/** Use inside routes protected by requireAuth to get the signed-in user (typed, never undefined). */
export function currentUser(req: Express.Request) {
  if (!req.user) throw new AppError("UNAUTHENTICATED", "Please sign in to continue");
  return req.user;
}
