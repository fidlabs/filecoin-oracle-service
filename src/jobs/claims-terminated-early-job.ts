import { isSectorDeadFromDealInspectorContract } from "../blockchain/deal-inspector-contract";
import { getCompletedDealsToCheckClaimTerminationFromDb } from "../services/db/db-service";
import { fetchStateSectorPartition } from "../services/filecoin-api-service";
import { baseLogger } from "../utils/logger";
import { SectorStatus } from "../utils/types";

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

    const terminatedClaims: {
      onChainDealId: bigint;
      provider: bigint;
      claimId: bigint;
      status: SectorStatus;
    }[] = [];

    claimTrackingLogger.info("Start processing completed deals...");

    for (const deal of completedDeals) {
      claimTrackingLogger.info(`Processing deal id: ${deal.onChainDealId}...`);

      for (const claim of deal.claims) {
        const { claimId } = claim;

        claimTrackingLogger.info(`Processing claim ID ${claimId}...`);

        const storageProviderId = `f0${deal.provider.toString()}`;

        const stateSectorInfo = await fetchStateSectorPartition(
          storageProviderId,
          Number(claim.sector),
        );

        const isSectorDead = await isSectorDeadFromDealInspectorContract(
          deal.onChainDealId,
          claim.sector,
          stateSectorInfo.Deadline,
          stateSectorInfo.Partition,
        );

        if (isSectorDead) {
          terminatedClaims.push({
            claimId: claim.claimId,
            onChainDealId: deal.onChainDealId,
            provider: deal.provider,
            status: SectorStatus.Dead,
          });

          claimTrackingLogger.info(
            `Marking claim ${claimId} for early termination (SP: ${storageProviderId}, DealId: ${deal.onChainDealId} Sector: ${claim.sector})`,
          );
        }
      }

      claimTrackingLogger.info(
        `Finished processing deal id: ${deal.onChainDealId}, claims ${terminatedClaims.length} / ${deal.claims?.length} marked for early termination`,
      );
    }

    claimTrackingLogger.info(
      `Finished processing all completed deals. Total claims marked for early termination: ${terminatedClaims.length}`,
    );

    // await updateClaimSectorStatusInDb(terminatedClaims);

    // await setClaimTerminatedEarlyOnClientContract(
    //   terminatedClaims.map((claim) => claim.claimId),
    // );
  } catch (err) {
    claimTrackingLogger.error({ err }, "Job failed");
  } finally {
    claimTrackingLogger.info("Job finished");
  }
}
