import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/client/index";
import { PrismaClient as DmobPrismaClient } from "../../prismaDmob/generated/client/index";

let prismaClient: PrismaClient;
let dmobPrismaClient: DmobPrismaClient;

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

export function getDmobPrismaClient() {
  if (!dmobPrismaClient) {
    const adapter = new PrismaPg({
      connectionString: process.env.DMOB_DATABASE_URL,
    });

    dmobPrismaClient = new DmobPrismaClient({
      adapter,
    });
  }

  return dmobPrismaClient;
}
