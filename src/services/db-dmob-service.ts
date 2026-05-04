import { getDmobPrismaClient } from "./prisma-service";

const dmobPrismaClient = getDmobPrismaClient();

export async function getClientAllocationInfoByProviderIdFromDmobDb(
  providerId: string,
  allocationIds: number[],
): Promise<{
  termStart?: bigint;
  termMax?: bigint;
  allocationsCount: bigint;
}> {
  const allocationInfo = await dmobPrismaClient.unified_verified_deal.aggregate(
    {
      where: {
        type: {
          in: ["claim", "claimUpdated"],
        },
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
    termStart: allocationInfo._min.termStart
      ? BigInt(allocationInfo._min.termStart)
      : undefined,
    termMax: allocationInfo._max.termMax
      ? BigInt(allocationInfo._max.termMax)
      : undefined,
    allocationsCount: BigInt(allocationInfo._count.claimId),
  };
}
