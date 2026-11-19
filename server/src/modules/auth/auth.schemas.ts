import { z } from "zod";

export const loginSchema = z.object({
  // `error` is used when the field is missing or not a string at all
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string({ error: "Password is required" }).min(1, "Password is required").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
