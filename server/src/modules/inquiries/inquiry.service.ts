// Database work for inquiries. Every read starts from accessScope(user), so the
// access rule cannot be forgotten in one place and remembered in another.
import { prisma } from "../../db";
import { AppError } from "../../lib/errors";
import type { InquiryStatus } from "../../generated/prisma/enums";
import type { InquiryWhereInput } from "../../generated/prisma/models";
import type { PublicUser } from "../auth/auth.service";
import {
  DUPLICATE_WINDOW_MINUTES,
  accessScope,
  allowedNextStatuses,
  canAssign,
  isAllowedTransition,
} from "./inquiry.policy";
import type { CreateInquiryInput, ListQuery, UpdateAssigneeInput, UpdateStatusInput } from "./inquiry.schemas";

// Load only the names of related users - never their emails or password hashes.
const include = {
  createdBy: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
} as const;

type InquiryRow = NonNullable<Awaited<ReturnType<typeof findVisible>>>;

/** The JSON shape the frontend receives for one inquiry. */
function toDto(row: InquiryRow) {
  return {
    id: row.id,
    customerName: row.customerName,
    contact: row.contact,
    subject: row.subject,
    description: row.description,
    status: row.status,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    assignedTo: row.assignedTo,
    // The server tells the UI which buttons make sense; it still re-checks on every update.
    allowedNextStatuses: allowedNextStatuses(row.status),
  };
}
export type InquiryDto = ReturnType<typeof toDto>;

/** Finds an inquiry only if this user may see it. Returns null otherwise. */
function findVisible(user: PublicUser, id: number) {
  return prisma.inquiry.findFirst({ where: { AND: [{ id }, accessScope(user)] }, include });
}

/**
 * Same 404 for "does not exist" and "exists but not yours".
 * A different answer would let someone discover which ids exist by guessing.
 */
async function getVisibleOrThrow(user: PublicUser, id: number): Promise<InquiryRow> {
  const row = await findVisible(user, id);
  if (!row) throw new AppError("NOT_FOUND", "Inquiry not found. It may have been removed, or you may not have access to it.");
  return row;
}

// ---------------------------------------------------------------------------

export async function listInquiries(user: PublicUser, query: ListQuery) {
  const filters: InquiryWhereInput[] = [accessScope(user)];

  if (query.status) filters.push({ status: query.status });
  if (query.assigned === "me") filters.push({ assignedToId: user.id });
  if (query.q) {
    const search: InquiryWhereInput[] = [
      { customerName: { contains: query.q, mode: "insensitive" } },
      { contact: { contains: query.q, mode: "insensitive" } },
      { subject: { contains: query.q, mode: "insensitive" } },
    ];
    // Typing "12" or "#12" also finds inquiry number 12.
    const asId = Number(query.q.replace(/^#/, ""));
    if (Number.isInteger(asId) && asId > 0 && asId <= 2_147_483_647) search.push({ id: asId });
    filters.push({ OR: search });
  }

  const where: InquiryWhereInput = { AND: filters };
  const [rows, total] = await prisma.$transaction([
    prisma.inquiry.findMany({
      where,
      include,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }], // most recently active first
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.inquiry.count({ where }),
  ]);

  return { items: rows.map(toDto), total, page: query.page, pageSize: query.pageSize };
}

export async function getInquiry(user: PublicUser, id: number) {
  return toDto(await getVisibleOrThrow(user, id));
}

export async function createInquiry(user: PublicUser, input: CreateInquiryInput) {
  // Who handles it? Staff: always themselves. Admin: anyone (or nobody); defaults to themselves.
  let assignedToId: number | null = user.id;
  if (input.assignedToId !== undefined && input.assignedToId !== user.id) {
    if (!canAssign(user)) throw new AppError("FORBIDDEN", "Only admins can assign inquiries to other staff");
    if (input.assignedToId !== null) await assertUserExists(input.assignedToId, "assignedToId");
    assignedToId = input.assignedToId;
  }

  // Double-submit check (within what this user can see, so nothing private leaks).
  if (!input.confirmDuplicate) {
    const since = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60_000);
    const existing = await prisma.inquiry.findFirst({
      where: {
        AND: [
          accessScope(user),
          { contact: input.contact },
          { subject: { equals: input.subject, mode: "insensitive" } },
          { createdAt: { gte: since } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      throw new AppError(
        "POSSIBLE_DUPLICATE",
        `An inquiry with the same contact and subject was saved in the last ${DUPLICATE_WINDOW_MINUTES} minutes.`,
        { details: { existingId: existing.id } },
      );
    }
  }

  const row = await prisma.inquiry.create({
    data: {
      customerName: input.customerName,
      contact: input.contact,
      subject: input.subject,
      description: input.description,
      createdById: user.id,
      assignedToId,
    },
    include,
  });
  return toDto(row);
}

export async function updateStatus(user: PublicUser, id: number, input: UpdateStatusInput) {
  const current = await getVisibleOrThrow(user, id);
  assertSameVersion(current, input.version);

  if (!isAllowedTransition(current.status, input.status)) {
    throw new AppError("INVALID_STATUS_TRANSITION", transitionMessage(current.status, input.status), {
      details: { currentStatus: current.status, allowedNextStatuses: allowedNextStatuses(current.status) },
    });
  }

  return versionedUpdate(user, id, input.version, { status: input.status });
}

export async function updateAssignee(user: PublicUser, id: number, input: UpdateAssigneeInput) {
  const current = await getVisibleOrThrow(user, id); // 404 first: don't reveal it exists
  if (!canAssign(user)) throw new AppError("FORBIDDEN", "Only admins can change who is handling an inquiry");
  assertSameVersion(current, input.version);
  if (input.assignedToId !== null) await assertUserExists(input.assignedToId, "assignedToId");

  return versionedUpdate(user, id, input.version, { assignedToId: input.assignedToId });
}

/** People an admin can pick in the "Assigned to" dropdown. */
export function listAssignableUsers() {
  return prisma.user.findMany({ select: { id: true, name: true, role: true }, orderBy: { name: "asc" } });
}

// ---------------------------------------------------------------------------
// Helpers

function assertSameVersion(current: InquiryRow, seenVersion: number) {
  if (current.version !== seenVersion) {
    throw new AppError("VERSION_CONFLICT", "This inquiry was changed by someone else. Review the latest details and try again.", {
      details: { current: toDto(current) },
    });
  }
}

/**
 * The safe update: "change it ONLY IF the version is still the one the user saw".
 * The version check and the write happen in ONE SQL statement:
 *   UPDATE inquiries SET ..., version = version + 1 WHERE id = $1 AND version = $2
 * So even if two requests arrive at the same moment, only one can win.
 */
async function versionedUpdate(
  user: PublicUser,
  id: number,
  seenVersion: number,
  data: { status?: InquiryStatus; assignedToId?: number | null },
) {
  const { count } = await prisma.inquiry.updateMany({
    where: { id, version: seenVersion },
    data: { ...data, version: { increment: 1 } },
  });

  const latest = await getVisibleOrThrow(user, id); // 404 if it was deleted meanwhile
  if (count === 0) assertSameVersion(latest, seenVersion); // someone else won the race -> 409
  return toDto(latest);
}

async function assertUserExists(userId: number, field: string) {
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) throw new AppError("VALIDATION_ERROR", "Please check the highlighted fields", { fields: { [field]: "This staff member does not exist" } });
}

const LABEL: Record<InquiryStatus, string> = { NEW: "New", IN_PROGRESS: "In Progress", RESOLVED: "Resolved" };

function transitionMessage(from: InquiryStatus, to: InquiryStatus) {
  if (from === to) return `This inquiry is already ${LABEL[to]}.`;
  const allowed = allowedNextStatuses(from).map((s) => LABEL[s]).join(" or ");
  return `Cannot move an inquiry from ${LABEL[from]} to ${LABEL[to]}. From ${LABEL[from]} it can only move to ${allowed}.`;
}
