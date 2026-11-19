// One error type for every expected failure in the API.
// Throw it anywhere (route, service, middleware); the error handler turns it into JSON:
//   { "error": { "code": "...", "message": "...", "fields": { ... }, "details": { ... } } }

export type ErrorCode =
  | "VALIDATION_ERROR" // 400 - bad or missing input
  | "UNAUTHENTICATED" // 401 - not signed in / invalid or expired login
  | "FORBIDDEN" // 403 - signed in, but not allowed to do this action
  | "NOT_FOUND" // 404 - does not exist (or you may not know it exists)
  | "INVALID_STATUS_TRANSITION" // 409 - e.g. NEW -> RESOLVED is not allowed
  | "VERSION_CONFLICT" // 409 - someone else changed the record since you loaded it
  | "POSSIBLE_DUPLICATE" // 409 - same contact + subject saved moments ago
  | "INTERNAL_ERROR"; // 500 - our bug; details only go to the server log

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_STATUS_TRANSITION: 409,
  VERSION_CONFLICT: 409,
  POSSIBLE_DUPLICATE: 409,
  INTERNAL_ERROR: 500,
};

type ErrorExtras = {
  /** Per-field messages, e.g. { subject: "Subject is required" } */
  fields?: Record<string, string>;
  /** Extra data the client can use, e.g. the latest version of a record */
  details?: Record<string, unknown>;
};

export class AppError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;
  readonly details?: Record<string, unknown>;

  constructor(
    readonly code: ErrorCode,
    message: string,
    extras: ErrorExtras = {},
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS_BY_CODE[code];
    this.fields = extras.fields;
    this.details = extras.details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fields && { fields: this.fields }),
        ...(this.details && { details: this.details }),
      },
    };
  }
}
