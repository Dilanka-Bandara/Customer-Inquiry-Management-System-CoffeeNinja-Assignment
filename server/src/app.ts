// Builds the Express app. Kept separate from index.ts so tests can import the app
// without starting a real network server.
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config";
import { prisma } from "./db";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { authRouter } from "./modules/auth/auth.routes";
import { inquiryRouter } from "./modules/inquiries/inquiry.routes";
import { userRouter } from "./modules/users/user.routes";

export function createApp() {
  const app = express();

  // Only our frontend may call the API, and it may send the login cookie.
  app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  // Health check: proves the API is up AND can reach PostgreSQL. (Public)
  app.get("/api/health", async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/inquiries", inquiryRouter); // all routes require sign-in
  app.use("/api/users", userRouter); // admin only

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
