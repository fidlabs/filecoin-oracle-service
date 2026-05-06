import { getCompletedDealsToCheckClaimTerminationFromDb } from "../services/db/db-service";
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

    const terminatedClaims: bigint[] = [];

    claimTrackingLogger.info("Start processing completed deals...");

    for (const deal of completedDeals) {
      claimTrackingLogger.info(`Processing deal id: ${deal.onChainDealId}...`);

      for (const claim of deal.claims) {
        const { claimId } = claim;

        claimTrackingLogger.info(`Processing claim ID ${claimId}...`);

        const storageProviderId = `f0${deal.provider.toString()}`;

        const isSectorDead = false; // TODO:
        // const isSectorDead = await isSectorDeadFromDealInspectorContract(
        //   deal.onChainDealId,
        //   BigInt(claim.sector),
        // );

        if (isSectorDead) {
          terminatedClaims.push(claimId);
          claimTrackingLogger.info(
            `Marking claim ${claimId} for early termination (SP: ${storageProviderId}, DealId: ${deal.onChainDealId} Sector: ${claim.sector})`,
          );
        }
      }
    }

    // await setClaimTerminatedEarlyOnClientContract(
    //   terminatedAllocations.map(BigInt),
    // );
    //await setClaimTerminatedEarlyOnClientContract(terminatedAllocations);
  } catch (err) {
    claimTrackingLogger.error({ err }, "Job failed");
  } finally {
    claimTrackingLogger.info("Job finished");
  }
}
