//   GET /api/users  -> people an admin can assign inquiries to (admin only)
import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import { listAssignableUsers } from "../inquiries/inquiry.service";

export const userRouter = Router();

userRouter.get("/", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  res.json({ items: await listAssignableUsers() });
});
