/**
 * Create an admin account. Sign-up only allows STUDENT and OWNER, so admins are made here.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='long-password' ADMIN_NAME='Site Admin' npm run admin:create
 */
import "dotenv/config";
import argon2 from "argon2";

import { prisma } from "../config/database";
import { registerSchema } from "../modules/auth/auth.validation";

async function main() {
  // Reuse sign-up validation so admin emails and passwords follow the same rules.
  const parsed = registerSchema.safeParse({
    fullName: process.env.ADMIN_NAME || "BoardMate Admin",
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: "OWNER",
  });

  if (!parsed.success) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters): " +
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }

  const { fullName, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  if (existing) {
    // Never silently promote an existing student or owner.
    console.log(
      existing.role === "ADMIN"
        ? `Admin ${email} already exists. Nothing changed.`
        : `${email} already belongs to a ${existing.role} account. Use a different email.`,
    );
    return;
  }

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash: await argon2.hash(password),
      role: "ADMIN",
    },
    select: { id: true, email: true },
  });

  console.log(`Created admin ${user.email} (${user.id})`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
