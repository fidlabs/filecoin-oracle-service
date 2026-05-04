import { getDmobPrismaClient } from "./prisma-service";

const dmobPrismaClient = getDmobPrismaClient();

export async function getClientAllocationInfoByProviderIdFromDmobDb(
  allocationIds: number[],
): Promise<{
  termStart?: bigint;
  termMin?: bigint;
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
        termMin: true,
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
    termMin: allocationInfo._max.termMin
      ? BigInt(allocationInfo._max.termMin)
      : undefined,
    allocationsCount: BigInt(allocationInfo._count.claimId),
  };
}
