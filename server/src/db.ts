// One shared Prisma client for the whole server.
// Prisma 7 talks to Postgres through a "driver adapter" (here: node-postgres / `pg`).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export function createPrismaClient(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const url = process.env["DATABASE_URL"];
if (!url) {
  throw new Error("DATABASE_URL is not set. Copy server/.env.example to server/.env.");
}

export const prisma = createPrismaClient(url);
