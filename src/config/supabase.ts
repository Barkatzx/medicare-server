import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

globalForPrisma.prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

export const prisma = globalForPrisma.prisma;
// Optional: Add connection handling
prisma
  .$connect()
  .then(() => console.log("Connected to database"))
  .catch((error) => console.error("Database connection error:", error));
