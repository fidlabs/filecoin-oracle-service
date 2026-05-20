import { Address } from "viem";
import { getRpcClient } from "../blockchain/blockchain-client";
import { terminateRailOnValidatorContract } from "../blockchain/validator-contract";
import { getCompletedDealsToTerminateFromDb } from "../services/db-service";
import { getPrismaClient } from "../services/prisma-service";
import { baseLogger } from "../utils/logger";
import { syncDealsJob } from "./sync-deal-job";

const claimTrackingLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Terminate Deal Job] " },
);

export async function terminateRailByDealId(onChainDealId: bigint) {
  try {
    claimTrackingLogger.info(`Terminating rail for deal ${onChainDealId}...`);

    const prismaClient = getPrismaClient();

    const deal = await prismaClient.porep_market_deal.findUnique({
      where: {
        onChainDealId,
        isRailTerminated: false,
      },
    });

    if (!deal) {
      claimTrackingLogger.warn(
        `No deal found in database with onChainDealId ${onChainDealId}, cannot terminate rail`,
      );
      return;
    }

    await terminateRailOnValidatorContract(
      deal.validatorContractAddress as Address,
    );

    await prismaClient.porep_market_deal.update({
      where: {
        onChainDealId,
        railId: deal.railId,
      },
      data: {
        isRailTerminated: true,
      },
    });

    await syncDealsJob();

    claimTrackingLogger.info(
      `Successfully terminated rail for deal ${onChainDealId} and updated database record`,
    );
  } catch (err) {
    claimTrackingLogger.error(
      { err },
      `Failed to terminate rail for deal ${onChainDealId}`,
    );
  }
}

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

      await terminateRailOnValidatorContract(
        deal.validatorContractAddress as Address,
      );

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
    }
  } catch (err) {
    claimTrackingLogger.error({ err }, "Job failed");
  } finally {
    claimTrackingLogger.info("Job finished");
  }
}
