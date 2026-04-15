import { settleRailOnFilecoinPayContract } from "../blockchain/filecoinpay-contract";
import {
  getCompletedDealsToSettleFromDb,
  storeLastSettlementToDb,
} from "../services/db-service";
import { baseLogger } from "../utils/logger";

const settlementChildLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SettlementBot Job] " },
);

export async function runSettlementBotJob() {
  try {
    settlementChildLogger.info("Job started");

    const completedDeals = await getCompletedDealsToSettleFromDb();

    settlementChildLogger.info(
      `Fetched ${completedDeals.length} completed deals from PoRep Market contract`,
    );

    if (completedDeals.length === 0) {
      settlementChildLogger.info(
        "No completed deals found in PoRep Market contract, skipping settlement bot execution",
      );
      return;
    }

    for (const deal of completedDeals) {
      settlementChildLogger.info(
        `Processing completed deal with ID ${deal.onChainDealId} for provider ${deal.provider} and client ${deal.client}`,
      );

      const blockNumber = await settleRailOnFilecoinPayContract(deal.railId);
      await storeLastSettlementToDb(deal.id, blockNumber);

      settlementChildLogger.info(
        `Successfully settled rail with ID ${deal.railId} for completed deal with ID ${deal.onChainDealId}`,
      );
    }
  } catch (err) {
    settlementChildLogger.error({ err }, "Failed");
  } finally {
    settlementChildLogger.info("Job finished");
  }
}
