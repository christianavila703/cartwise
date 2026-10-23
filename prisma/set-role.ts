import { PrismaClient, Role } from "@prisma/client";

// Usage: npm run user:role -- <email> <USER|ADMIN>

const db = new PrismaClient();

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !role || !(role in Role)) {
    throw new Error("Usage: npm run user:role -- <email> <USER|ADMIN>");
  }

  const user = await db.user.update({
    where: { email: email.trim().toLowerCase() },
    data: { role: role as Role },
    select: { email: true, role: true },
  });
  console.log(`${user.email} is now ${user.role}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
