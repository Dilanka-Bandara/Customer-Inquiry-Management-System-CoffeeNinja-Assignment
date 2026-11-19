// Builds the Express app. Kept separate from index.ts so tests can import the app
// without starting a real network server.
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config";
import { prisma } from "./db";

export function createApp() {
  const app = express();

  // Only our frontend may call the API, and it may send the login cookie.
  app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  // Health check: proves the API is up AND can reach PostgreSQL.
  app.get("/api/health", async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  });

  // (Auth and inquiry routes are added in the next steps.)

  // Unknown API routes get a JSON 404 instead of Express's default HTML page.
  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  // Last-resort error handler: never leak stack traces to the client.
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res
      .status(500)
      .json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } });
  };
  app.use(errorHandler);

  return app;
}
