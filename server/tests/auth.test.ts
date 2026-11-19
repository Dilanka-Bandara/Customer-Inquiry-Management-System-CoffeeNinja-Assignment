// Security rule: authentication is enforced by the API, not just hidden in the UI.
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app, resetDatabase, signIn } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
});

describe("authentication", () => {
  it.each([
    ["GET", "/api/inquiries"],
    ["GET", "/api/inquiries/1"],
    ["POST", "/api/inquiries"],
    ["PATCH", "/api/inquiries/1/status"],
    ["GET", "/api/auth/me"],
  ] as const)("%s %s without a login cookie returns 401", async (method, url) => {
    const res = await request(app)[method.toLowerCase() as "get"](url);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects a forged token", async () => {
    const res = await request(app).get("/api/inquiries").set("Cookie", "inquiry_session=not.a.real.token");
    expect(res.status).toBe(401);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const wrongPassword = await request(app).post("/api/auth/login").send({ email: "alice@test.com", password: "nope" });
    const unknownEmail = await request(app).post("/api/auth/login").send({ email: "ghost@test.com", password: "nope" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body); // reveals nothing about which emails exist
  });

  it("sets an httpOnly cookie on login and forgets the user after logout", async () => {
    const agent = await signIn("alice@test.com");
    expect((await agent.get("/api/auth/me")).body.user.email).toBe("alice@test.com");

    await agent.post("/api/auth/logout").expect(204);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("never sends the password hash to the client", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "alice@test.com", password: "Password123!" });
    expect(res.headers["set-cookie"]?.[0]).toMatch(/HttpOnly/);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });
});
