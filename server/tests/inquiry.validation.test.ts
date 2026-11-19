// Validation rule: the API rejects bad data on its own, even if a client skips the form checks
// (brief: "real world situation" #1).
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { resetDatabase, signIn, validInquiryBody } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
});

describe("creating an inquiry", () => {
  it("rejects missing fields with a message for each field and saves nothing", async () => {
    const alice = await signIn("alice@test.com");

    const res = await alice.post("/api/inquiries").send({ customerName: "   ", contact: "not-a-contact" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields).toMatchObject({
      customerName: "Customer name is required", // whitespace-only counts as missing
      contact: "Enter a valid email address or phone number",
      subject: "Subject is required",
      description: "Description is required",
    });
    expect(await prisma.inquiry.count()).toBe(0);
  });

  it("creates a valid inquiry as New, version 1, handled by its creator", async () => {
    const alice = await signIn("alice@test.com");

    const res = await alice.post("/api/inquiries").send({ ...validInquiryBody, contact: "  Nimal@Example.COM " });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: "NEW",
      version: 1,
      contact: "nimal@example.com", // trimmed + lowercased
      assignedTo: { name: "Alice" },
      allowedNextStatuses: ["IN_PROGRESS"],
    });
  });

  it("warns about a likely double submit, but allows it once confirmed", async () => {
    const alice = await signIn("alice@test.com");
    await alice.post("/api/inquiries").send(validInquiryBody).expect(201);

    const again = await alice.post("/api/inquiries").send(validInquiryBody);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("POSSIBLE_DUPLICATE");

    await alice.post("/api/inquiries").send({ ...validInquiryBody, confirmDuplicate: true }).expect(201);
    expect(await prisma.inquiry.count()).toBe(2);
  });
});

describe("predictable failures for bad ids and input", () => {
  it.each(["abc", "0", "-1", "1.5", "99999999999"])("GET /api/inquiries/%s returns 400", async (badId) => {
    const alice = await signIn("alice@test.com");
    const res = await alice.get(`/api/inquiries/${badId}`);
    expect(res.status).toBe(400);
    expect(res.body.error.fields.id).toBeDefined();
  });

  it("returns 404 for an id that does not exist", async () => {
    const alice = await signIn("alice@test.com");
    expect((await alice.get("/api/inquiries/12345")).status).toBe(404);
  });

  it("returns 400 for a broken JSON body instead of crashing", async () => {
    const alice = await signIn("alice@test.com");
    const res = await alice.post("/api/inquiries").set("Content-Type", "application/json").send("{broken");
    expect(res.status).toBe(400);
  });
});
