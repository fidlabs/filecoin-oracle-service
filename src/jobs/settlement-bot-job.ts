import { baseLogger } from "../utils/logger.js";

const settlementChildLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SettlementBot Job] " },
);

export async function runSettlementBotJob() {
  settlementChildLogger.info("Started");

  try {
    settlementChildLogger.info("Running settlement bot...");
  } catch (err) {
    settlementChildLogger.error({ err }, "Failed");
  }

  settlementChildLogger.info("Finished");
}
