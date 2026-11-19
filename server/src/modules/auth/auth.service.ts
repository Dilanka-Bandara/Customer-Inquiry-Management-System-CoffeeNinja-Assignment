// Sign-in rules: check the password, create and verify login tokens.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../../config";
import { prisma } from "../../db";
import { AppError } from "../../lib/errors";
import type { LoginInput } from "./auth.schemas";

/** How long a login lasts. Kept short because a JWT cannot be cancelled before it expires. */
export const SESSION_HOURS = 8;

/** The user data that is safe to send to the browser (never the password hash). */
export const publicUserSelect = { id: true, email: true, name: true, role: true } as const;
export type PublicUser = { id: number; email: string; name: string; role: "ADMIN" | "STAFF" };

// Used when the email does not exist, so a wrong email takes as long as a wrong password.
// This stops attackers from discovering which emails are registered by measuring response time.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);

export async function verifyCredentials({ email, password }: LoginInput): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk) {
    // Same message for both cases - never reveal whether the email exists.
    throw new AppError("UNAUTHENTICATED", "Incorrect email or password");
  }
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export function signToken(userId: number): string {
  return jwt.sign({}, config.JWT_SECRET, {
    subject: String(userId),
    expiresIn: `${SESSION_HOURS}h`,
    algorithm: "HS256",
  });
}

/** Returns the user id inside a valid token, or null if the token is missing, forged or expired. */
export function readUserIdFromToken(token: string | undefined): number | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ["HS256"] });
    const id = Number(typeof payload === "object" ? payload.sub : NaN);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
