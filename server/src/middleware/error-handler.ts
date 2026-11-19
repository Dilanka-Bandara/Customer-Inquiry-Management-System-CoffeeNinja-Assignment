// Turns any thrown error into a predictable JSON response.
// Express 5 forwards errors from async handlers here automatically.
import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../lib/errors";

/** Any route that did not match gets a JSON 404 (not Express's HTML page). */
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError("NOT_FOUND", "Route not found"));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Our own, expected errors
  if (err instanceof AppError) {
    res.status(err.status).json(err.toJSON());
    return;
  }

  // Errors from express.json(): broken JSON body or body too large
  if (err?.type === "entity.parse.failed") {
    res.status(400).json(new AppError("VALIDATION_ERROR", "Request body is not valid JSON").toJSON());
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: { code: "VALIDATION_ERROR", message: "Request body is too large" } });
    return;
  }

  // Anything else is a bug: log details on the server, return a safe message to the client.
  console.error(err);
  res.status(500).json(new AppError("INTERNAL_ERROR", "Something went wrong. Please try again.").toJSON());
};
