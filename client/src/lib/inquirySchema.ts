// Form rules for a new inquiry. These MIRROR the server's rules (server/src/modules/inquiries/inquiry.schemas.ts)
// so the user gets instant feedback. The server still checks everything again - this is only for guidance.
import { z } from 'zod'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[\d\s\-()]{7,20}$/
const hasEnoughDigits = (s: string) => (s.match(/\d/g) ?? []).length >= 7

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`)

export const inquiryFormSchema = z.object({
  customerName: text('Customer name', 2, 100),
  contact: text('Contact', 1, 150).refine(
    (v) => EMAIL.test(v) || (PHONE.test(v) && hasEnoughDigits(v)),
    'Enter a valid email address or phone number',
  ),
  subject: text('Subject', 3, 150),
  description: text('Description', 10, 2000),
})

export type InquiryForm = z.input<typeof inquiryFormSchema>
export type InquiryFormErrors = Partial<Record<keyof InquiryForm, string>>

export const DESCRIPTION_MAX = 2000

/** Returns one message per invalid field (empty object = valid). */
export function validateInquiryForm(values: InquiryForm): InquiryFormErrors {
  const result = inquiryFormSchema.safeParse(values)
  if (result.success) return {}
  const errors: InquiryFormErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof InquiryForm
    errors[key] ??= issue.message
  }
  return errors
}
