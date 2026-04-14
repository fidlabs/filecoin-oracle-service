import { getDmobPrismaClient } from "./prisma-service";

const dmobPrismaClient = getDmobPrismaClient();

export async function getClientAllocationInfoByClientIdFromDmobDb(
  providerId: string,
  allocationIds: number[],
): Promise<{
  termStart?: number;
  termMax?: number;
  allocationsCount: number;
}> {
  const allocationInfo = await dmobPrismaClient.unified_verified_deal.aggregate(
    {
      where: {
        type: {
          in: ["claim", "claimUpdated"],
        },
        providerId,
        claimId: {
          in: allocationIds,
        },
      },
      _min: {
        termStart: true,
      },
      _max: {
        termMax: true,
      },
      _count: {
        claimId: true,
      },
    },
  );

  return {
    termStart: allocationInfo._min.termStart || undefined,
    termMax: allocationInfo._max.termMax || undefined,
    allocationsCount: allocationInfo._count.claimId,
  };
}
