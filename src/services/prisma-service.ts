import { PrismaClient } from "../../prisma/generated/client/index.js";
import { PrismaClient as DmobPrismaClient } from "../../prismaDmob/generated/client/index.js";

let prismaClient: PrismaClient;
let dmobPrismaClient: DmobPrismaClient;

export function getPrismaClient() {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }

  return prismaClient;
}

export function getDmobPrismaClient() {
  if (!dmobPrismaClient) {
    dmobPrismaClient = new DmobPrismaClient();
  }

  return dmobPrismaClient;
}
