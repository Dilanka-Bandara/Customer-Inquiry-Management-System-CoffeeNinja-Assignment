// HTTP layer for sign-in. Routes stay thin: validate input -> call service -> send response.
//   POST /api/auth/login   -> sets the httpOnly cookie, returns the user
//   POST /api/auth/logout  -> clears the cookie
//   GET  /api/auth/me      -> who am I? (used by the frontend on page load)
import { Router, type CookieOptions } from "express";
import { config } from "../../config";
import { validate } from "../../lib/validate";
import { AUTH_COOKIE, currentUser, requireAuth } from "../../middleware/require-auth";
import { loginSchema } from "./auth.schemas";
import { SESSION_HOURS, signToken, verifyCredentials } from "./auth.service";

const cookieOptions: CookieOptions = {
  httpOnly: true, // page JavaScript cannot read it (protects against token theft via XSS)
  sameSite: "lax", // not sent on cross-site POSTs (basic CSRF protection)
  secure: config.NODE_ENV === "production", // HTTPS-only outside local development
  path: "/",
};

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const credentials = validate(loginSchema, req.body);
  const user = await verifyCredentials(credentials);

  res.cookie(AUTH_COOKIE, signToken(user.id), { ...cookieOptions, maxAge: SESSION_HOURS * 60 * 60 * 1000 });
  res.json({ user });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE, cookieOptions);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: currentUser(req) });
});
