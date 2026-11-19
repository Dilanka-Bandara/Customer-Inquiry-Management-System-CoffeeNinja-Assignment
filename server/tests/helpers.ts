// Shared test helpers: a clean database per test, known users, and a signed-in client.
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";

export const app = createApp();
export const PASSWORD = "Password123!";

export type TestUsers = Awaited<ReturnType<typeof resetDatabase>>;

/** Empties the test database and creates 3 users: an admin and two staff members. */
export async function resetDatabase() {
  await prisma.$executeRaw`TRUNCATE TABLE inquiries, users RESTART IDENTITY CASCADE`;

  // Low bcrypt cost: tests don't need strong hashing, they need to be fast.
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const make = (email: string, name: string, role: "ADMIN" | "STAFF") =>
    prisma.user.create({ data: { email, name, role, passwordHash } });

  return {
    admin: await make("admin@test.com", "Admin", "ADMIN"),
    alice: await make("alice@test.com", "Alice", "STAFF"),
    bob: await make("bob@test.com", "Bob", "STAFF"),
  };
}

/**
 * Logs in and returns a supertest "agent". An agent remembers cookies like a browser,
 * so every request made with it is sent as that signed-in user.
 */
export async function signIn(email: string) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
  return agent;
}

/** Creates an inquiry directly in the database (faster than going through the API). */
export function createInquiry(createdById: number, overrides: Partial<{ status: "NEW" | "IN_PROGRESS" | "RESOLVED"; assignedToId: number | null; version: number }> = {}) {
  return prisma.inquiry.create({
    data: {
      customerName: "Test Customer",
      contact: "customer@test.com",
      subject: "Test subject",
      description: "A description that is long enough.",
      createdById,
      assignedToId: createdById,
      ...overrides,
    },
  });
}

export const validInquiryBody = {
  customerName: "Nimal Perera",
  contact: "nimal@example.com",
  subject: "Bulk order pricing",
  description: "Asking for a price list for 50+ units.",
};
