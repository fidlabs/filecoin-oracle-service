import { batchValidateSectorStatus } from "../blockchain/sector-status-inspector-contract";
import {
  getCompletedDealsToCheckClaimTerminationFromDb,
  updateClaimSectorStatusInDb,
} from "../services/db/db-service";
import { fetchStateSectorPartition } from "../services/filecoin-api-service";
import { baseLogger } from "../utils/logger";
import { ChainSectorStatus, SectorStatus } from "../utils/types";

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
      sector: bigint;
    }[] = [];

    claimTrackingLogger.info("Start processing completed deals...");

    const CHUNK_SIZE = 50;

    const claimsToProcess = completedDeals.flatMap((deal) =>
      deal.claims.map((claim) => ({
        claimId: claim.claimId,
        onChainDealId: deal.onChainDealId,
        provider: deal.provider,
        sector: claim.sector,
      })),
    );

    claimTrackingLogger.info(
      `Total claims to process for termination check: ${claimsToProcess.length}`,
    );

    for (let i = 0; i < claimsToProcess.length; i += CHUNK_SIZE) {
      const chunk = claimsToProcess.slice(i, i + CHUNK_SIZE);

      claimTrackingLogger.info(
        `Processing claims batch ${i / CHUNK_SIZE + 1} / ${Math.ceil(claimsToProcess.length / CHUNK_SIZE)}, chunk size: ${chunk.length}`,
      );

      const sectorInfo = await Promise.all(
        chunk.map(async (claim) => {
          const storageProviderId = `f0${claim.provider.toString()}`;

          const stateSectorInfo = await fetchStateSectorPartition(
            storageProviderId,
            Number(claim.sector),
          );

          return {
            ...claim,
            deadline: stateSectorInfo.Deadline,
            partition: stateSectorInfo.Partition,
          };
        }),
      );

      const validatedClaims = await batchValidateSectorStatus(
        sectorInfo.map((claim) => ({
          onChainDealId: claim.onChainDealId,
          sector: claim.sector,
          status: ChainSectorStatus.Dead,
          deadline: claim.deadline,
          partition: claim.partition,
        })),
      );

      validatedClaims.forEach((validateClaim, index) => {
        if (!validateClaim.isValid) return;

        const item = sectorInfo[index];

        terminatedClaims.push({
          claimId: item.claimId,
          provider: item.provider,
          onChainDealId: validateClaim.call.onChainDealId,
          sector: validateClaim.call.sector,
          status: SectorStatus.Dead,
        });
      });
    }

    claimTrackingLogger.info(
      `Finished processing all completed deals. Total claims marked for early termination: ${terminatedClaims.length}`,
    );

    if (terminatedClaims.length > 0) {
      await updateClaimSectorStatusInDb(terminatedClaims);

      claimTrackingLogger.info(
        `Updated ${terminatedClaims.length} claims in database with terminated status.`,
      );

      // claimTrackingLogger.info(
      //   `Setting ${terminatedClaims.length} claims as terminated early on client contract.`,
      // );

      // await setClaimTerminatedEarlyOnClientContract(
      //   terminatedClaims.map((claim) => claim.claimId),
      // );
    }
  } catch (err) {
    claimTrackingLogger.error({ err }, "Job failed");
  } finally {
    claimTrackingLogger.info("Job finished");
  }
}
