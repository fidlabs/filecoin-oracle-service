import { settleRailOnFilecoinPayContract } from "../blockchain/filecoinpay-contract";
import { getCompletedDealsFromPoRepMarketContract } from "../blockchain/porep-market.contract";
import { baseLogger } from "../utils/logger";

const settlementChildLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SettlementBot Job] " },
);

export async function runSettlementBotJob() {
  settlementChildLogger.info("Started");

  try {
    const completedDeals = await getCompletedDealsFromPoRepMarketContract();
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
        `Processing completed deal with ID ${deal.dealId} for provider ${deal.provider} and client ${deal.client}`,
      );

      await settleRailOnFilecoinPayContract(deal.railId);

      settlementChildLogger.info(
        `Successfully settled rail with ID ${deal.railId} for completed deal with ID ${deal.dealId}`,
      );
    }
  } catch (err) {
    settlementChildLogger.error({ err }, "Failed");
  }

  settlementChildLogger.info("Finished");
}
