// The business rules, in one place, as plain functions (no database, no Express).
import type { InquiryStatus } from "../../generated/prisma/enums";
import type { InquiryWhereInput } from "../../generated/prisma/models";
import type { PublicUser } from "../auth/auth.service";

// ---------------------------------------------------------------------------
// Rule 1 - Access: who can see which inquiries?
//   ADMIN -> every inquiry.
//   STAFF -> only inquiries they created OR are assigned to.
// This filter is added to EVERY inquiry query, so a staff member can never
// load someone else's inquiry - not from the list, and not from a direct link.
// ---------------------------------------------------------------------------
export function accessScope(user: PublicUser): InquiryWhereInput {
  if (user.role === "ADMIN") return {};
  return { OR: [{ createdById: user.id }, { assignedToId: user.id }] };
}

/** Only admins can (re)assign inquiries to other people. */
export function canAssign(user: PublicUser): boolean {
  return user.role === "ADMIN";
}

// ---------------------------------------------------------------------------
// Rule 2 - Status lifecycle:
//   NEW -> IN_PROGRESS -> RESOLVED, and RESOLVED -> IN_PROGRESS ("reopen").
//   Not allowed: skipping (NEW -> RESOLVED), going back to NEW, or "changing" to the same status.
// ---------------------------------------------------------------------------
const ALLOWED_TRANSITIONS: Record<InquiryStatus, readonly InquiryStatus[]> = {
  NEW: ["IN_PROGRESS"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["IN_PROGRESS"],
};

export function allowedNextStatuses(from: InquiryStatus): readonly InquiryStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function isAllowedTransition(from: InquiryStatus, to: InquiryStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

// ---------------------------------------------------------------------------
// Rule 3 - Possible duplicates:
//   Same contact + same subject (ignoring case) saved within the last few minutes
//   is most likely a double submit. We WARN (409) instead of silently saving,
//   but the user can confirm and save anyway - a customer may genuinely ask twice.
// ---------------------------------------------------------------------------
export const DUPLICATE_WINDOW_MINUTES = 10;
