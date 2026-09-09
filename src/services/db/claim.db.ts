import { SectorStatus } from "../../../prisma/generated/client";
import { prismaClient } from "./db-client";

export async function updateClaimSectorStatusInDb(
  claimsToUpdate: {
    onChainDealId: bigint;
    provider: bigint;
    claimId: bigint;
    status: SectorStatus;
    sector: bigint;
  }[],
) {
  return prismaClient.$transaction(
    claimsToUpdate.map((claim) =>
      prismaClient.porep_market_deal_claim.update({
        where: {
          claimId_sector_provider: {
            claimId: claim.claimId,
            sector: claim.sector,
            provider: claim.provider,
          },
        },
        data: {
          status: claim.status,
        },
      }),
    ),
  );
}
