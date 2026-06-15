import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/client/index";

let prismaClient: PrismaClient;

export function getPrismaClient() {
  if (!prismaClient) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });

    prismaClient = new PrismaClient({
      adapter,
    });
  }

  return prismaClient;
}
