// Tells TypeScript that `req.user` exists (it is set by the requireAuth middleware).
import type { PublicUser } from "../modules/auth/auth.service";

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export {};
