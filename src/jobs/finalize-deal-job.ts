import { finalizeDealOnPoRepMarketContract } from "../blockchain/porep-market.contract";
import { settleRailOnFilecoinPayContract } from "../blockchain/filecoinpay-contract";
import { getRpcClient } from "../blockchain/blockchain-client";
import {
  getDealsToFinalizeFromDb,
  storeLastSettlementToDb,
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
          { dealId: deal.onChainDealId, railId: deal.railId },
          "Attempting settlement before finalizing deal",
        );

        let settlementResult;
        try {
          const result = await settleRailOnFilecoinPayContract(deal.railId);
          if (result.receipt.status !== "success") {
            throw new Error(
              `Pre-finalization settlement reverted for rail ${deal.railId}`,
            );
          }
          settlementResult = result;
        } catch (err) {
          finalizeDealLogger.warn(
            { err, dealId: deal.onChainDealId, railId: deal.railId },
            "Pre-finalization settlement failed; continuing with deal finalization",
          );
        }

        if (settlementResult) {
          await storeOnChainTransactionToDb(
            deal.onChainDealId,
            settlementResult,
          );
          await storeLastSettlementToDb(
            deal.id,
            settlementResult.receipt.blockNumber,
          );
        }

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

        if (transactionResult.receipt.status !== "success") {
          throw new Error(
            `Deal finalization reverted for deal ${deal.onChainDealId}`,
          );
        }

        await storeOnChainTransactionToDb(
          deal.onChainDealId,
          transactionResult,
        );

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
