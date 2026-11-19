// Checks untrusted input (body, params, query) against a Zod schema.
// On success returns clean, typed data. On failure throws a 400 with one message per field.
import type { z } from "zod";
import { AppError } from "./errors";

export function validate<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_root";
    // Keep only the first message per field - the most useful one for the user.
    fields[key] ??= issue.message;
  }
  throw new AppError("VALIDATION_ERROR", "Please check the highlighted fields", { fields });
}
