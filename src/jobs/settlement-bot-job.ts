import { getRpcClient } from "../blockchain/blockchain-client";
import { getRailOnFilecoinPayContract, settleRailOnFilecoinPayContract } from "../blockchain/filecoinpay-contract";
import {
  getCompletedDealsToSettleFromDb,
  getDealsToCheckForFinalRailSettlementFromDb,
  storeLastSettlementToDb,
  storeOnChainTransactionToDb,
} from "../services/db/db-service";
import { baseLogger } from "../utils/logger";
import { syncSettlementHistoryJob } from "./sync-settlement-history-job";

const settlementChildLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SettlementBot Job] " },
);

export async function runSettlementBotJob() {
  try {
    settlementChildLogger.info("Job started");

    const terminatedRailIds = await settleTerminatedRails();

    await syncSettlementHistoryJob();

    const completedDeals = await getCompletedDealsToSettleFromDb();

    if (completedDeals.length === 0) {
      settlementChildLogger.info(
        "No completed deals found that require settlement. Job will exit.",
      );
      return;
    }

    settlementChildLogger.info(
      `Fetched ${completedDeals.length} completed deals to settle from database`,
    );

    for (const deal of completedDeals) {
      if (terminatedRailIds.has(deal.railId)) continue;
      try {
        settlementChildLogger.info(
          `Attempting to settle rail with ID ${deal.railId} for completed deal with ID ${deal.onChainDealId}`,
        );

        const transactionResult = await settleRailOnFilecoinPayContract(
          deal.railId,
        );

        await storeLastSettlementToDb(
          deal.id,
          transactionResult.receipt.blockNumber,
        );

        await storeOnChainTransactionToDb(
          deal.onChainDealId,
          transactionResult,
        );

        settlementChildLogger.info(
          `Successfully settled rail with ID ${deal.railId} for completed deal with ID ${deal.onChainDealId}`,
        );
      } catch (error) {
        settlementChildLogger.error(
          { err: error },
          `Failed to settle rail with ID ${deal.railId} for completed deal with ID ${deal.onChainDealId}`,
        );
      }
    }
  } catch (err) {
    settlementChildLogger.error({ err }, "Failed");
    throw err;
  } finally {
    settlementChildLogger.info("Job finished");
  }
}

async function settleTerminatedRails(): Promise<Set<bigint>> {
  const handledRailIds = new Set<bigint>();
  const deals = await getDealsToCheckForFinalRailSettlementFromDb();
  if (deals.length === 0) return handledRailIds;

  const currentEpoch = await getRpcClient().getBlockNumber();
  for (const deal of deals) {
    try {
      const rail = await getRailOnFilecoinPayContract(deal.railId);
      if (rail === null) {
        handledRailIds.add(deal.railId);
        continue;
      }
      if (rail.endEpoch === 0n) continue;

      // Also exclude these rails from the regular monthly settlement path.
      handledRailIds.add(deal.railId);
      if (currentEpoch <= rail.endEpoch) continue;

      // Even settledUpTo >= endEpoch may still need a call to finalize the rail.
      // A partial settlement or failure is retried on the next job run; only
      // Filecoin Pay's on-chain state determines whether the rail is finalized.
      const result = await settleRailOnFilecoinPayContract(
        deal.railId,
        rail.endEpoch,
      );
      await storeOnChainTransactionToDb(deal.onChainDealId, result);
      await storeLastSettlementToDb(deal.id, result.receipt.blockNumber);
      settlementChildLogger.info(
        { railId: deal.railId, endEpoch: rail.endEpoch },
        "Submitted final rail settlement",
      );
    } catch (error) {
      handledRailIds.add(deal.railId);
      settlementChildLogger.error(
        { err: error, railId: deal.railId, dealId: deal.onChainDealId },
        "Failed to check or settle terminated rail; will retry on next run",
      );
    }
  }
  return handledRailIds;
}
