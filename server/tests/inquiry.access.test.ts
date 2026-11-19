// Security rule: staff only reach inquiries they created or are assigned to - enforced by the API,
// even when someone skips the UI and calls a URL directly (brief: "real world situation" #3).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { createInquiry, resetDatabase, signIn, type TestUsers } from "./helpers";

let users: TestUsers;
beforeEach(async () => {
  users = await resetDatabase();
});

describe("access rule", () => {
  it("returns 404 when staff open a direct link to another person's inquiry", async () => {
    const alicesInquiry = await createInquiry(users.alice.id);
    const bob = await signIn("bob@test.com");

    const res = await bob.get(`/api/inquiries/${alicesInquiry.id}`);

    expect(res.status).toBe(404);
    // Same answer as for an id that does not exist at all - nothing about the record leaks.
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(JSON.stringify(res.body)).not.toContain("Test Customer");
  });

  it("does not let staff change another person's inquiry, and the record stays unchanged", async () => {
    const alicesInquiry = await createInquiry(users.alice.id);
    const bob = await signIn("bob@test.com");

    const res = await bob.patch(`/api/inquiries/${alicesInquiry.id}/status`).send({ status: "IN_PROGRESS", version: 1 });

    expect(res.status).toBe(404);
    const after = await prisma.inquiry.findUniqueOrThrow({ where: { id: alicesInquiry.id } });
    expect(after.status).toBe("NEW");
    expect(after.version).toBe(1);
  });

  it("lists only the staff member's own or assigned inquiries; admin sees all", async () => {
    const own = await createInquiry(users.alice.id);
    const assignedToAlice = await createInquiry(users.admin.id, { assignedToId: users.alice.id });
    await createInquiry(users.bob.id); // not Alice's

    const alice = await signIn("alice@test.com");
    const aliceIds = (await alice.get("/api/inquiries")).body.items.map((i: { id: number }) => i.id);
    expect(aliceIds.sort()).toEqual([own.id, assignedToAlice.id].sort());

    const admin = await signIn("admin@test.com");
    expect((await admin.get("/api/inquiries")).body.total).toBe(3);
  });

  it("only admins can reassign an inquiry", async () => {
    const inquiry = await createInquiry(users.alice.id);

    const alice = await signIn("alice@test.com");
    const denied = await alice.patch(`/api/inquiries/${inquiry.id}/assignee`).send({ assignedToId: users.bob.id, version: 1 });
    expect(denied.status).toBe(403);

    const admin = await signIn("admin@test.com");
    const ok = await admin.patch(`/api/inquiries/${inquiry.id}/assignee`).send({ assignedToId: users.bob.id, version: 1 });
    expect(ok.status).toBe(200);
    expect(ok.body.assignedTo.name).toBe("Bob");

    // Bob can now open it.
    const bob = await signIn("bob@test.com");
    expect((await bob.get(`/api/inquiries/${inquiry.id}`)).status).toBe(200);
  });
});
