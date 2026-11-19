// Input rules for the inquiry endpoints. The API never trusts the browser:
// every body, URL parameter and query string is checked here first.
import { z } from "zod";
import { InquiryStatus } from "../../generated/prisma/enums";

const MAX_DB_INT = 2_147_483_647; // Postgres INTEGER limit - bigger ids would crash the query

/** A database id from the URL, e.g. "/api/inquiries/12". Rejects "abc", "-1", "1.5", "0". */
export const idSchema = z
  .string()
  .regex(/^\d+$/, "Must be a positive whole number")
  .transform(Number)
  .refine((n) => n > 0 && n <= MAX_DB_INT, "Must be a positive whole number");

export const idParamSchema = z.object({ id: idSchema });

// Email, or a phone number with at least 7 digits (spaces, +, -, brackets allowed).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s\-()]{7,20}$/;
const hasEnoughDigits = (s: string) => (s.match(/\d/g) ?? []).length >= 7;

const text = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const createInquirySchema = z.object({
  customerName: text("Customer name", 2, 100),
  contact: text("Contact", 1, 150)
    .refine((v) => EMAIL.test(v) || (PHONE.test(v) && hasEnoughDigits(v)), "Enter a valid email address or phone number")
    // Store emails in lowercase so "Nimal@X.com" and "nimal@x.com" count as the same contact
    .transform((v) => (EMAIL.test(v) ? v.toLowerCase() : v)),
  subject: text("Subject", 3, 150),
  description: text("Description", 10, 2000),
  /** Admin only: who should handle it. Staff inquiries are always assigned to themselves. */
  assignedToId: z.number().int().positive().max(MAX_DB_INT).nullable().optional(),
  /** Set to true after the user has seen the "possible duplicate" warning and still wants to save. */
  confirmDuplicate: z.boolean().optional().default(false),
});
export type CreateInquiryInput = z.infer<typeof createInquirySchema>;

/** Every change must say which version the user was looking at (stale-data protection). */
const versionSchema = z.number({ error: "Version is required" }).int().positive();

export const updateStatusSchema = z.object({
  status: z.enum(InquiryStatus, { error: "Status must be NEW, IN_PROGRESS or RESOLVED" }),
  version: versionSchema,
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const updateAssigneeSchema = z.object({
  assignedToId: z.number({ error: "Choose a staff member or null" }).int().positive().max(MAX_DB_INT).nullable(),
  version: versionSchema,
});
export type UpdateAssigneeInput = z.infer<typeof updateAssigneeSchema>;

export const listQuerySchema = z.object({
  status: z.enum(InquiryStatus, { error: "Unknown status" }).optional(),
  /** Free-text search over customer name, contact and subject */
  q: z.string().trim().max(100).optional(),
  /** "me" = only inquiries assigned to the signed-in user */
  assigned: z.literal("me").optional(),
  page: z.coerce.number().int().min(1, "Page must be 1 or more").max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1, "Page size must be between 1 and 100").max(100, "Page size must be between 1 and 100").default(20),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
