// Business rules: allowed status changes, and stale data from a second browser tab.
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { createInquiry, resetDatabase, signIn, type TestUsers } from "./helpers";

let users: TestUsers;
beforeEach(async () => {
  users = await resetDatabase();
});

describe("status changes", () => {
  it("follows the full lifecycle including reopen, increasing the version each time", async () => {
    const { id } = await createInquiry(users.alice.id);
    const alice = await signIn("alice@test.com");

    const steps = [
      { status: "IN_PROGRESS", version: 1 },
      { status: "RESOLVED", version: 2 },
      { status: "IN_PROGRESS", version: 3 }, // reopen
    ];
    for (const step of steps) {
      const res = await alice.patch(`/api/inquiries/${id}/status`).send(step);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: step.status, version: step.version + 1 });
    }
  });

  it("rejects skipping from New straight to Resolved with 409 and a helpful message", async () => {
    const { id } = await createInquiry(users.alice.id);
    const alice = await signIn("alice@test.com");

    const res = await alice.patch(`/api/inquiries/${id}/status`).send({ status: "RESOLVED", version: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    expect(res.body.error.message).toMatch(/can only move to In Progress/);
    expect((await prisma.inquiry.findUniqueOrThrow({ where: { id } })).status).toBe("NEW");
  });

  it("rejects an update from a stale tab instead of silently overwriting", async () => {
    const { id } = await createInquiry(users.alice.id);
    const tabA = await signIn("alice@test.com");
    const tabB = await signIn("alice@test.com");

    // Both tabs loaded version 1. Tab A saves first.
    await tabA.patch(`/api/inquiries/${id}/status`).send({ status: "IN_PROGRESS", version: 1 }).expect(200);

    // Tab B still thinks it's version 1.
    const res = await tabB.patch(`/api/inquiries/${id}/status`).send({ status: "IN_PROGRESS", version: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("VERSION_CONFLICT");
    // The response carries the latest data so the UI can show it.
    expect(res.body.error.details.current).toMatchObject({ status: "IN_PROGRESS", version: 2 });
  });

  it("lets only one of two simultaneous updates win", async () => {
    const { id } = await createInquiry(users.alice.id);
    const alice = await signIn("alice@test.com");
    const admin = await signIn("admin@test.com");

    const results = await Promise.all([
      alice.patch(`/api/inquiries/${id}/status`).send({ status: "IN_PROGRESS", version: 1 }),
      admin.patch(`/api/inquiries/${id}/status`).send({ status: "IN_PROGRESS", version: 1 }),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await prisma.inquiry.findUniqueOrThrow({ where: { id } })).version).toBe(2);
  });
});
