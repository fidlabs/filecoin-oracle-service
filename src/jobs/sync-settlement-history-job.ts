import { SERVICE_CONFIG } from "../config/env";
import { getFilecoinPayRailFromCdp } from "../services/cdp-fetch-service";
import {
  getCompletedDealsToSettleFromDb,
  storeLastSettlementToDb,
} from "../services/db/db-service";
import { baseLogger } from "../utils/logger";

const settlementHistorySyncLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Settlement History Sync Job] " },
);

const FILECOIN_GENESIS_TIMESTAMP_SECONDS = (() => {
  switch (Number(SERVICE_CONFIG.CHAIN_ID)) {
    case 314:
      return 1598306400n;
    case 314159:
      return 1667326380n;
    default:
      throw new Error(
        `Unsupported CHAIN_ID for epoch->date conversion: ${SERVICE_CONFIG.CHAIN_ID}`,
      );
  }
})();

const FILECOIN_EPOCH_DURATION_SECONDS = 30n;

function filecoinEpochToDate(epoch: bigint) {
  const timestampSeconds =
    epoch * FILECOIN_EPOCH_DURATION_SECONDS +
    FILECOIN_GENESIS_TIMESTAMP_SECONDS;

  return new Date(Number(timestampSeconds) * 1000);
}

function isAtLeastThirtyDaysAgo(date: Date | null | undefined) {
  if (!date) return false;
  return date.getTime() <= Date.now() - 30 * 24 * 60 * 60 * 1000;
}

export async function syncSettlementHistoryFromCdp() {
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

  for (const deal of completedDeals) {
    try {
      settlementHistorySyncLogger.info(
        `Syncing settlement history for dealId ${deal.onChainDealId} rail ${deal.railId}...`,
      );

      const rail = await getFilecoinPayRailFromCdp(deal.railId);

      const settledUpToFromCdp = BigInt(rail.settledUpTo);
      const lastSettledUpFromCdpDate = filecoinEpochToDate(settledUpToFromCdp);

      const lastSettlementAt = deal.settlement_history[0]?.settlementAt
        ? deal.settlement_history[0].settlementAt
        : deal.activatePaymentAt;

      const was30DaysAgoFromDb = isAtLeastThirtyDaysAgo(lastSettlementAt);
      const was30DaysAgoFromCdp = isAtLeastThirtyDaysAgo(
        lastSettledUpFromCdpDate,
      );

      if (was30DaysAgoFromDb && was30DaysAgoFromCdp) {
        settlementHistorySyncLogger.info(
          `Settlement history for rail ${deal.railId} is already up to date at epoch ${settledUpToFromCdp}`,
        );
        continue;
      }

      await storeLastSettlementToDb(
        deal.id,
        settledUpToFromCdp,
        lastSettledUpFromCdpDate,
      );

      settlementHistorySyncLogger.info(
        `Stored settlement history for rail ${deal.railId} at epoch ${settledUpToFromCdp}`,
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

    await syncSettlementHistoryFromCdp();
  } catch (error) {
    settlementHistorySyncLogger.error({ error }, "Job failed");
  } finally {
    settlementHistorySyncLogger.info("Job finished");
  }
}
