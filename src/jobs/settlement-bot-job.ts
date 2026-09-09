import { settleRailOnFilecoinPayContract } from "../blockchain/filecoinpay-contract";
import {
  getCompletedDealsToSettleFromDb,
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
