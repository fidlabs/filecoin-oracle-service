import { finalizeDealOnPoRepMarketContract } from "../blockchain/porep-market.contract";
import { getRpcClient } from "../blockchain/blockchain-client";
import {
  getDealsToFinalizeFromDb,
  storeOnChainTransactionToDb,
} from "../services/db/db-service";
import { baseLogger } from "../utils/logger";

const finalizeDealLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Finalize Deal Job] " },
);

export async function finalizeDealJob() {
  try {
    finalizeDealLogger.info("Job started");

    const currentEpoch = await getRpcClient().getBlockNumber();
    const dealsToFinalize = await getDealsToFinalizeFromDb(currentEpoch);

    if (dealsToFinalize.length === 0) {
      finalizeDealLogger.info(
        { currentEpoch },
        "No Active deals with an elapsed service period found. Job will exit.",
      );
      return;
    }

    finalizeDealLogger.info(
      { currentEpoch, dealCount: dealsToFinalize.length },
      "Found deals to finalize",
    );

    for (const deal of dealsToFinalize) {
      try {
        finalizeDealLogger.info(
          {
            dealId: deal.onChainDealId,
            serviceEndEpoch: deal.serviceEndEpoch,
          },
          "Finalizing deal",
        );

        const transactionResult = await finalizeDealOnPoRepMarketContract(
          deal.onChainDealId,
        );

        await storeOnChainTransactionToDb(deal.id, transactionResult);

        finalizeDealLogger.info(
          { dealId: deal.onChainDealId },
          "Deal finalized successfully",
        );
      } catch (err) {
        finalizeDealLogger.error(
          { err, dealId: deal.onChainDealId },
          "Failed to finalize deal",
        );
      }
    }
  } catch (err) {
    finalizeDealLogger.error({ err }, "Job failed");
  } finally {
    finalizeDealLogger.info("Job finished");
  }
}
