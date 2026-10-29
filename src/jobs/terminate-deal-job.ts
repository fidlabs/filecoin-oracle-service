import { Address } from "viem";
import { getRpcClient } from "../blockchain/blockchain-client";
import { settleRailOnFilecoinPayContract } from "../blockchain/filecoinpay-contract";
import { terminateRailOnValidatorContract } from "../blockchain/validator-contract";
import {
  getCompletedDealsToTerminateFromDb,
  storeOnChainTransactionToDb,
  storeLastSettlementToDb,
} from "../services/db/db-service";
import { getPrismaClient } from "../services/prisma-service";
import { baseLogger } from "../utils/logger";

const claimTrackingLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Terminate Deal Job] " },
);

export async function trackTerminateDealJob() {
  try {
    claimTrackingLogger.info("Job started");

    const prismaClient = getPrismaClient();
    const rpcClient = getRpcClient();

    const currentBlock = await rpcClient.getBlockNumber();

    const dealsToTerminate =
      await getCompletedDealsToTerminateFromDb(currentBlock);

    if (dealsToTerminate.length === 0) {
      claimTrackingLogger.info(
        "No completed deals found that require rail termination. Job will exit.",
      );
      return;
    }

    claimTrackingLogger.info(
      `Found ${dealsToTerminate.length} deals to terminate in database, start terminating rails...`,
    );

    for (const deal of dealsToTerminate) {
      try {
        claimTrackingLogger.info(
          `Settling railId ${deal.railId} before terminating deal ${deal.onChainDealId}...`,
        );

        let settlementResult;

        try {
          const result = await settleRailOnFilecoinPayContract(deal.railId);

          if (result.receipt.status !== "success") {
            throw new Error(
              `Pre-termination settlement reverted for rail ${deal.railId}`,
            );
          }

          settlementResult = result;
        } catch (err) {
          claimTrackingLogger.warn(
            { err, railId: deal.railId, dealId: deal.onChainDealId },
            "Pre-termination settlement failed; continuing with termination. Outstanding settlement requires follow-up",
          );
        }

        if (settlementResult) {
          await storeOnChainTransactionToDb(deal.id, settlementResult);
          await storeLastSettlementToDb(
            deal.id,
            settlementResult.receipt.blockNumber,
          );
        }

        claimTrackingLogger.info(
          `Terminating railId ${deal.railId} for deal ${deal.onChainDealId}...`,
        );

        const transactionResult = await terminateRailOnValidatorContract(
          deal.validatorContractAddress as Address,
        );

        if (transactionResult.receipt.status !== "success") {
          throw new Error(`Rail termination reverted for rail ${deal.railId}`);
        }

        await storeOnChainTransactionToDb(deal.id, transactionResult);

        await prismaClient.porep_market_deal.update({
          where: {
            onChainDealId: deal.onChainDealId,
          },
          data: {
            isRailTerminated: true,
          },
        });

        claimTrackingLogger.info(
          `Successfully terminated railId ${deal.railId} for deal ${deal.onChainDealId} and updated database record`,
        );
      } catch (err) {
        claimTrackingLogger.error(
          { err, railId: deal.railId, dealId: deal.onChainDealId },
          "Settlement or termination failed; will retry deal on the next run",
        );
      }
    }
  } catch (err) {
    claimTrackingLogger.error({ err }, "Job failed");
  } finally {
    claimTrackingLogger.info("Job finished");
  }
}
