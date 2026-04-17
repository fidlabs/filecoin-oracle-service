import { Address } from "viem";
import { getRpcClient } from "../blockchain/blockchain-client";
import { terminateRailOnValidatorContract } from "../blockchain/validator-contract";
import { getCompletedDealsToTerminateFromDb } from "../services/db-service";
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
      claimTrackingLogger.info(
        `Terminating railId ${deal.railId} for deal ${deal.onChainDealId}...`,
      );

      await prismaClient.$transaction(
        async (tx) => {
          await terminateRailOnValidatorContract(
            deal.railId,
            deal.validatorContractAddress as Address,
          );

          await tx.porep_market_deal.update({
            where: {
              onChainDealId: deal.onChainDealId,
            },
            data: {
              isRailTerminated: true,
            },
          });
        },
        {
          timeout: 2 * 60 * 1000, // 2 minutes
        },
      );

      claimTrackingLogger.info(
        `Successfully terminated railId ${deal.railId} for deal ${deal.onChainDealId} and updated database record`,
      );
    }
  } catch (err) {
    claimTrackingLogger.error({ err }, "Job failed");
  } finally {
    claimTrackingLogger.info("Job finished");
  }
}
