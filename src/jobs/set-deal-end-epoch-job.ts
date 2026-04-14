import { Address } from "viem";
import { getRpcClient } from "../blockchain/blockchain-client";
import {
  modifyRailPaymentOnValidatorContract,
  setDealEndEpochOnValidatorContract,
} from "../blockchain/validator-contract";
import { getCompletedDealsToSetEndEpochFromDb } from "../services/db-service";
import { getPrismaClient } from "../services/prisma-service";
import { baseLogger } from "../utils/logger";

const dealEndEpochLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Set Deal End Epoch Job] " },
);

export async function trackDealEndEpochJob() {
  try {
    dealEndEpochLogger.info("Job started");

    const prismaClient = getPrismaClient();

    const rpcClient = getRpcClient();
    const currentBlock = await rpcClient.getBlockNumber();

    // set the deal end epoch on validator contract if the deal end epoch is in the future
    const dealsToSetEndEpoch =
      await getCompletedDealsToSetEndEpochFromDb(currentBlock);

    dealEndEpochLogger.info(
      `Found ${dealsToSetEndEpoch.length} deals in database to update deal end epoch, start updating...`,
    );

    for (const deal of dealsToSetEndEpoch) {
      dealEndEpochLogger.info(
        `Setting deal end epoch ${deal.dealEndEpoch} on validator contract for deal ${deal.onChainDealId}...`,
      );

      await prismaClient.$transaction(
        async (tx) => {
          if (deal.dealEndEpoch) {
            await setDealEndEpochOnValidatorContract(
              deal.onChainDealId,
              BigInt(deal.dealEndEpoch),
              deal.validatorContractAddress as Address,
            );

            await modifyRailPaymentOnValidatorContract(
              deal.validatorContractAddress as Address,
            );

            await tx.porep_market_deal.update({
              where: {
                onChainDealId: deal.onChainDealId,
              },
              data: {
                modifyRailPaymentAt: new Date(),
                isDealEndEpochSetOnChain: true,
              },
            });
          }
        },
        {
          timeout: 2 * 60 * 1000, // 2 minutes
        },
      );

      dealEndEpochLogger.info(
        `Successfully set deal end epoch ${deal.dealEndEpoch} on validator contract for deal ${deal.onChainDealId} and modified rail payment for railId ${deal.railId}`,
      );
    }
  } catch (err) {
    dealEndEpochLogger.error({ err }, "Job failed");
  } finally {
    dealEndEpochLogger.info("Job finished");
  }
}
