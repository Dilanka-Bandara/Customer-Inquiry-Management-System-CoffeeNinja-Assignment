// Runs ONCE before all tests: brings the test database schema up to date
// using the same migration files as development (so tests use the real schema).
import { execSync } from "node:child_process";

export default function setup() {
  const url = process.env["TEST_DATABASE_URL"] ?? "postgresql://inquiry:inquiry@localhost:5434/inquiry_test";
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}
