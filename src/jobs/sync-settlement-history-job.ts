import { getRpcClient } from "../blockchain/blockchain-client";
import {
  getCompletedDealsToSettleFromDb,
  storeLastSettlementToDb,
} from "../services/db/db-service";
import { getFilecoinPayRailFromHyperion } from "../services/hyperion-fetch-service";
import { baseLogger } from "../utils/logger";

const settlementHistorySyncLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Settlement History Sync Job] " },
);

const FILECOIN_EPOCH_DURATION_SECONDS = 30n;
const THIRTY_DAYS_IN_SECONDS = 30n * 24n * 60n * 60n;
const THIRTY_DAYS_IN_EPOCHS =
  THIRTY_DAYS_IN_SECONDS / FILECOIN_EPOCH_DURATION_SECONDS;

function isAtLeastThirtyDaysAgo(date: Date | null | undefined) {
  if (!date) return false;
  return date.getTime() <= Date.now() - Number(THIRTY_DAYS_IN_SECONDS) * 1000;
}

/**
 * Approximates the wall-clock time of a past epoch relative to the current
 * epoch, so no chain-specific genesis timestamp is needed.
 */
function epochToApproximateDate(epoch: bigint, currentEpoch: bigint) {
  const epochsAgo = currentEpoch - epoch;
  const secondsAgo = epochsAgo * FILECOIN_EPOCH_DURATION_SECONDS;

  return new Date(Date.now() - Number(secondsAgo) * 1000);
}

export async function syncSettlementHistoryFromHyperion() {
  const completedDeals = await getCompletedDealsToSettleFromDb();

  if (completedDeals.length === 0) {
    settlementHistorySyncLogger.info(
      "No completed deals found to sync settlement history",
    );
    return;
  }

  settlementHistorySyncLogger.info(
    `Found ${completedDeals.length} completed deals to sync settlement history`,
  );

  const currentEpoch = await getRpcClient().getBlockNumber();

  for (const deal of completedDeals) {
    try {
      settlementHistorySyncLogger.info(
        `Syncing settlement history for dealId ${deal.onChainDealId} rail ${deal.railId}...`,
      );

      const rail = await getFilecoinPayRailFromHyperion(deal.railId);

      const settledUpToFromHyperion = BigInt(rail.settledUpTo);

      if (settledUpToFromHyperion > currentEpoch) {
        settlementHistorySyncLogger.warn(
          `Rail ${deal.railId} settledUpTo ${settledUpToFromHyperion} is ahead of current epoch ${currentEpoch}; Skipping.`,
        );
        continue;
      }

      const lastSettlementAt = deal.settlement_history[0]?.settlementAt
        ? deal.settlement_history[0].settlementAt
        : deal.activatePaymentAt;

      const was30DaysAgoFromDb = isAtLeastThirtyDaysAgo(lastSettlementAt);
      const was30DaysAgoFromHyperion =
        currentEpoch - settledUpToFromHyperion >= THIRTY_DAYS_IN_EPOCHS;

      if (was30DaysAgoFromDb && was30DaysAgoFromHyperion) {
        settlementHistorySyncLogger.info(
          `Settlement history for rail ${deal.railId} is already up to date at epoch ${settledUpToFromHyperion}`,
        );
        continue;
      }

      const lastSettledUpFromHyperionDate = epochToApproximateDate(
        settledUpToFromHyperion,
        currentEpoch,
      );

      await storeLastSettlementToDb(
        deal.id,
        settledUpToFromHyperion,
        lastSettledUpFromHyperionDate,
      );

      settlementHistorySyncLogger.info(
        `Stored settlement history for rail ${deal.railId} at epoch ${settledUpToFromHyperion} (~${lastSettledUpFromHyperionDate.toISOString()})`,
      );
    } catch (error) {
      settlementHistorySyncLogger.error(
        { error, dealId: deal.onChainDealId, railId: deal.railId },
        "Failed to sync settlement history for deal",
      );
    }
  }
}

export async function syncSettlementHistoryJob() {
  try {
    settlementHistorySyncLogger.info("Job started");

    await syncSettlementHistoryFromHyperion();
  } catch (error) {
    settlementHistorySyncLogger.error({ error }, "Job failed");
    throw error;
  } finally {
    settlementHistorySyncLogger.info("Job finished");
  }
}
