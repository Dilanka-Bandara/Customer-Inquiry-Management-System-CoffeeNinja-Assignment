// Unit tests for the business rules (pure functions - no database, no HTTP).
import { describe, expect, it } from "vitest";
import { accessScope, isAllowedTransition } from "../src/modules/inquiries/inquiry.policy";

describe("status lifecycle rule", () => {
  // Every possible (from, to) pair, so a future change to the rules can't slip through unnoticed.
  it.each([
    ["NEW", "IN_PROGRESS", true],
    ["IN_PROGRESS", "RESOLVED", true],
    ["RESOLVED", "IN_PROGRESS", true], // reopen
    ["NEW", "RESOLVED", false], // cannot skip "In Progress"
    ["NEW", "NEW", false],
    ["IN_PROGRESS", "NEW", false], // never back to New
    ["IN_PROGRESS", "IN_PROGRESS", false],
    ["RESOLVED", "NEW", false],
    ["RESOLVED", "RESOLVED", false],
  ] as const)("%s -> %s allowed: %s", (from, to, expected) => {
    expect(isAllowedTransition(from, to)).toBe(expected);
  });
});

describe("access rule", () => {
  it("admin has no restriction", () => {
    expect(accessScope({ id: 1, email: "a@x.com", name: "A", role: "ADMIN" })).toEqual({});
  });

  it("staff is limited to inquiries they created or are assigned to", () => {
    expect(accessScope({ id: 7, email: "s@x.com", name: "S", role: "STAFF" })).toEqual({
      OR: [{ createdById: 7 }, { assignedToId: 7 }],
    });
  });
});
