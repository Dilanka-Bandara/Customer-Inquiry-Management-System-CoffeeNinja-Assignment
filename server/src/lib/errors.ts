// One error type for every expected failure in the API.
// Throw it anywhere (route, service, middleware); the error handler turns it into JSON:
//   { "error": { "code": "...", "message": "...", "fields": { ... } } }

export type ErrorCode =
  | "VALIDATION_ERROR" // 400 - bad or missing input
  | "UNAUTHENTICATED" // 401 - not signed in / invalid or expired login
  | "FORBIDDEN" // 403 - signed in, but not allowed to do this action
  | "NOT_FOUND" // 404 - does not exist (or you may not know it exists)
  | "CONFLICT" // 409 - clashes with current state (bad status change, stale version)
  | "INTERNAL_ERROR"; // 500 - our bug; details only go to the server log

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    /** Per-field messages, e.g. { subject: "Subject is required" } */
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS_BY_CODE[code];
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, ...(this.fields && { fields: this.fields }) } };
  }
}
