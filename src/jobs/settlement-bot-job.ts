import { getCompletedDealsFromPoRepMarketContract } from "../blockchain/porep-market.contract.js";
import { baseLogger } from "../utils/logger.js";

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

    // TODO: Implement settlement bot logic here, e.g. call settlement function on porep market contract for each completed deal, or batch them if the contract supports it
  } catch (err) {
    settlementChildLogger.error({ err }, "Failed");
  }

  settlementChildLogger.info("Finished");
}
