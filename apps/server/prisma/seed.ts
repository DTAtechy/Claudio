import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@example.com";
  const passwordHash = await bcrypt.hash("changeme", 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  const existing = await prisma.case.findFirst({
    where: { caseNumber: "DEMO-001" },
  });
  if (!existing) {
    await prisma.case.create({
      data: {
        caseNumber: "DEMO-001",
        title: "Demo Maritime Injury Case",
        status: "INTAKE",
        practiceArea: "JONES_ACT",
        description:
          "Seed case to demonstrate the system. Replace or delete after first run.",
        incidentDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        statuteOfLimitations: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 365 * 3,
        ),
        notes: {
          create: {
            authorId: admin.id,
            body: "Initial intake completed. Awaiting medical records.",
          },
        },
      },
    });
  }

  console.log(`Seed complete. Admin login: ${adminEmail} / changeme`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
