import { batchValidateSectorStatus } from "../blockchain/sector-status-inspector-contract";
import {
  getCompletedDealsToCheckClaimTerminationFromDb,
  updateClaimSectorStatusInDb,
} from "../services/db/db-service";
import { fetchStateSectorPartition } from "../services/filecoin-api-service";
import { baseLogger } from "../utils/logger";
import { ChainSectorStatus, SectorStatus } from "../utils/types";
import { sleep } from "../utils/utils";

const claimTrackingLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Claims Terminated Early Job] " },
);

const FETCH_PARTITION_MAX_ATTEMPTS = 5;
const FETCH_PARTITION_INITIAL_RETRY_DELAY_MS = 1_000;
const FETCH_PARTITION_MAX_RETRY_DELAY_MS = 30_000;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

async function fetchStateSectorPartitionWithRetry({
  storageProviderId,
  sector,
  claimId,
}: {
  storageProviderId: string;
  sector: bigint;
  claimId: bigint;
}) {
  let retryDelayMs = FETCH_PARTITION_INITIAL_RETRY_DELAY_MS;

  for (let attempt = 1; attempt <= FETCH_PARTITION_MAX_ATTEMPTS; attempt++) {
    try {
      const stateSectorInfo = await fetchStateSectorPartition(
        storageProviderId,
        Number(sector),
      );

      if (attempt > 1) {
        claimTrackingLogger.info(
          `Fetched sector partition for claim ${claimId.toString()} after ${attempt} attempts`,
        );
      }

      return stateSectorInfo;
    } catch (error) {
      if (attempt === FETCH_PARTITION_MAX_ATTEMPTS) {
        claimTrackingLogger.error(
          {
            err: error,
            claimId: claimId.toString(),
            sector: sector.toString(),
            storageProviderId,
            attempts: attempt,
          },
          "Failed to fetch sector partition after all retry attempts. Claim will be skipped.",
        );
        return null;
      }

      claimTrackingLogger.warn(
        `Failed to fetch sector partition. Attempt ${attempt} of ${FETCH_PARTITION_MAX_ATTEMPTS}. Error: ${getErrorMessage(error)}`,
      );

      await sleep(retryDelayMs);

      retryDelayMs = Math.min(
        retryDelayMs * 2,
        FETCH_PARTITION_MAX_RETRY_DELAY_MS,
      );
    }
  }

  return null;
}

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

    const CHUNK_SIZE = 30;
    let checkedClaimsCount = 0;
    let failedClaimChecksCount = 0;

    const claimsToProcess: {
      claimId: bigint;
      onChainDealId: bigint;
      provider: bigint;
      sector: bigint;
    }[] = completedDeals.flatMap((deal) =>
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

      const sectorInfo = (
        await Promise.all(
          chunk.map(async (claim) => {
            const storageProviderId = `f0${claim.provider.toString()}`;

            const stateSectorInfo = await fetchStateSectorPartitionWithRetry({
              storageProviderId,
              sector: claim.sector,
              claimId: claim.claimId,
            });

            if (!stateSectorInfo) return null;

            return {
              ...claim,
              deadline: stateSectorInfo.Deadline,
              partition: stateSectorInfo.Partition,
            };
          }),
        )
      ).filter((claim) => claim !== null);

      checkedClaimsCount += sectorInfo.length;
      failedClaimChecksCount += chunk.length - sectorInfo.length;

      if (sectorInfo.length === 0) {
        claimTrackingLogger.warn(
          `No sector partition data fetched for claims batch ${i / CHUNK_SIZE + 1}. Batch will be skipped.`,
        );
        continue;
      }

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

      await sleep(2000);
    }

    claimTrackingLogger.info(
      `Claims termination check summary: checked ${checkedClaimsCount} claims, failed to check ${failedClaimChecksCount} claims after ${FETCH_PARTITION_MAX_ATTEMPTS} fetch attempts.`,
    );

    claimTrackingLogger.info(
      `Finished processing all completed deals. Total claims marked for early termination: ${terminatedClaims.length}`,
    );

    if (terminatedClaims.length > 0) {
      await updateClaimSectorStatusInDb(terminatedClaims);

      claimTrackingLogger.info(
        `Updated ${terminatedClaims.length} claims in database with DEAD sectors status.`,
      );
    }
  } catch (err) {
    claimTrackingLogger.error({ err }, "Job failed");
  } finally {
    claimTrackingLogger.info("Job finished");
  }
}
