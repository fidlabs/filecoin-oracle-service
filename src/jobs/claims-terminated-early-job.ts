import {
  getClientAllocationIdsPerDeal,
  setClaimTerminatedEarlyOnClientContract,
} from "../blockchain/client-contract";
import { getCompletedDealsFromPoRepMarketContract } from "../blockchain/porep-market.contract";
import { fetchClaims, fetchSectorInfo } from "../services/filecoin-api-service";
import { baseLogger } from "../utils/logger";

const claimTrackingLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Claims Terminated Early Job] " },
);

export async function trackClaimsTerminatedEarlyJob() {
  claimTrackingLogger.info("Job started");

  try {
    const completedDeals = await getCompletedDealsFromPoRepMarketContract();

    if (completedDeals.length === 0) {
      claimTrackingLogger.info(
        "No completed deals found in PoRep Market contract, skipping claims tracking",
      );
      return;
    }

    claimTrackingLogger.info(
      `Fetched ${completedDeals.length} completed deals from PoRep Market contract`,
    );

    const terminatedAllocations: number[] = [];

    claimTrackingLogger.info("Start processing completed deals...");

    for (const deal of completedDeals) {
      claimTrackingLogger.info(`Processing deal id: ${deal.dealId}...`);

      const allocationIds = await getClientAllocationIdsPerDeal(deal.dealId);

      for (const allocationId of allocationIds) {
        claimTrackingLogger.info(`Processing allocation ID ${allocationId}...`);

        const storageProviderId = `f0${deal.provider.toString()}`;

        const allocationInfo = await fetchClaims(
          storageProviderId,
          allocationId,
        );

        const sectorInfo = await fetchSectorInfo(
          storageProviderId,
          allocationInfo.Sector,
        );

        if (
          !sectorInfo.ExpectedDayReward ||
          !sectorInfo.ExpectedStoragePledge
        ) {
          terminatedAllocations.push(allocationId);
          claimTrackingLogger.info(
            `Marking allocation ${allocationId} for early termination (SP: ${storageProviderId}, DealId: ${deal.dealId} Sector: ${allocationInfo.Sector}, )`,
          );
        }
      }
    }

    await setClaimTerminatedEarlyOnClientContract(
      terminatedAllocations.map(BigInt),
    );
  } catch (err) {
    claimTrackingLogger.error({ err }, "Job failed");
  }

  claimTrackingLogger.info("Job finished");
}
