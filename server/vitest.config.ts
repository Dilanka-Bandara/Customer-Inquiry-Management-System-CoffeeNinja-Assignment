import "dotenv/config";
import { defineConfig } from "vitest/config";

// Tests run against a SEPARATE database (inquiry_test), never the dev data.
const TEST_DATABASE_URL =
  process.env["TEST_DATABASE_URL"] ?? "postgresql://inquiry:inquiry@localhost:5434/inquiry_test";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Applied before any test file imports our code, so src/db.ts connects to the test DB.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: process.env["JWT_SECRET"] ?? "test-secret-at-least-16-chars",
    },
    globalSetup: ["tests/global-setup.ts"], // runs migrations once before all tests
    // All test files share one database, so run them one after another (not in parallel).
    fileParallelism: false,
  },
});
