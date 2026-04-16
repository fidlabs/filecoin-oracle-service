import { setClaimTerminatedEarlyOnClientContract } from "../blockchain/client-contract";
import { getCompletedDealsToCheckClaimTerminationFromDb } from "../services/db-service";
import { fetchClaims, fetchSectorInfo } from "../services/filecoin-api-service";
import { baseLogger } from "../utils/logger";

const claimTrackingLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Claims Terminated Early Job] " },
);

export async function trackClaimsTerminatedEarlyJob() {
  try {
    claimTrackingLogger.info("Job started");

    const completedDeals =
      await getCompletedDealsToCheckClaimTerminationFromDb();

    if (completedDeals.length === 0) {
      claimTrackingLogger.info(
        "No completed deals found in database that require claim termination check. Job will exit.",
      );
      return;
    }

    claimTrackingLogger.info(
      `Fetched ${completedDeals.length} completed deals to check claim termination from database`,
    );

    const terminatedAllocations: bigint[] = [];

    claimTrackingLogger.info("Start processing completed deals...");

    for (const deal of completedDeals) {
      claimTrackingLogger.info(`Processing deal id: ${deal.onChainDealId}...`);

      for (const allocationId of deal.allocationIds) {
        claimTrackingLogger.info(`Processing allocation ID ${allocationId}...`);

        const storageProviderId = `f0${deal.provider.toString()}`;

        const allocationInfo = await fetchClaims(
          storageProviderId,
          Number(allocationId),
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
            `Marking allocation ${allocationId} for early termination (SP: ${storageProviderId}, DealId: ${deal.onChainDealId} Sector: ${allocationInfo.Sector}, )`,
          );
        }
      }
    }

    await setClaimTerminatedEarlyOnClientContract(
      terminatedAllocations.map(BigInt),
    );
  } catch (err) {
    claimTrackingLogger.error({ err }, "Job failed");
  } finally {
    claimTrackingLogger.info("Job finished");
  }
}
