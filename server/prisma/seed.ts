// Seeds test accounts and a few sample inquiries.
// Safe to run many times: users are upserted, sample inquiries are recreated.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db";

// All seeded accounts share this password (local development only).
const PASSWORD = "Password123!";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const upsertUser = (email: string, name: string, role: "ADMIN" | "STAFF") =>
    prisma.user.upsert({
      where: { email },
      update: { name, role, passwordHash },
      create: { email, name, role, passwordHash },
    });

  const admin = await upsertUser("admin@example.com", "Ava Admin", "ADMIN");
  const alice = await upsertUser("alice@example.com", "Alice Staff", "STAFF");
  const bob = await upsertUser("bob@example.com", "Bob Staff", "STAFF");

  // Remove old sample data AND restart ids at 1, so seeded inquiries are always #1-#4.
  await prisma.$executeRaw`TRUNCATE TABLE inquiries RESTART IDENTITY`;

  await prisma.inquiry.createMany({
    data: [
      {
        customerName: "Nimal Perera",
        contact: "nimal@example.com",
        subject: "Bulk order pricing",
        description: "Asking for a price list for 50+ units delivered monthly.",
        status: "NEW",
        createdById: alice.id,
        assignedToId: alice.id,
      },
      {
        customerName: "Sara Fernando",
        contact: "+94 77 123 4567",
        subject: "Late delivery",
        description: "Order placed last week has not arrived yet. Wants an update.",
        status: "IN_PROGRESS",
        createdById: alice.id,
        assignedToId: alice.id,
      },
      {
        customerName: "Kamal Silva",
        contact: "kamal@example.com",
        subject: "Invoice correction",
        description: "Company name is misspelled on the last invoice.",
        status: "RESOLVED",
        createdById: bob.id,
        assignedToId: bob.id,
      },
      {
        customerName: "Dilini Jayasuriya",
        contact: "+94 71 987 6543",
        subject: "Opening hours",
        description: "Wants to know if the shop is open on public holidays.",
        status: "NEW",
        createdById: admin.id,
        assignedToId: null,
      },
    ],
  });

  console.log("Seeded users: admin@example.com, alice@example.com, bob@example.com");
  console.log(`Password for all: ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
