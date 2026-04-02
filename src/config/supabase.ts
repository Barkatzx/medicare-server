import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
// Optional: Add connection handling
prisma
  .$connect()
  .then(() => console.log("Connected to database"))
  .catch((error) => console.error("Database connection error:", error));
