import {
  modifyRailPaymentOnValidatorContract,
  setDealEndEpochOnValidatorContract,
  terminateRailOnValidatorContract,
} from "src/blockchain/validator-contract.js";
import { Address } from "viem";
import { getRpcClient } from "../blockchain/blockchain-client.js";
import { getClientAllocationIdsPerDeal } from "../blockchain/client-contract.js";
import { getCompletedDealsFromPoRepMarketContract } from "../blockchain/porep-market.contract.js";
import {
  getDmobPrismaClient,
  getPrismaClient,
} from "../services/prisma-service.js";
import { baseLogger } from "../utils/logger.js";

const claimTrackingLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Terminate Deal Job] " },
);

export async function trackTerminateDealJob() {
  claimTrackingLogger.info("Job started");

  const prismaClient = getPrismaClient();
  const dmobPrismaClient = getDmobPrismaClient();

  try {
    // check for completed deals in porep market contract, source of truth for completed deals
    const contractCompletedDeals =
      await getCompletedDealsFromPoRepMarketContract();

    const rpcClient = getRpcClient();
    const currentBlock = await rpcClient.getBlockNumber();

    // STEP 1: verify completed deals and sync the deal end epoch based on DMOB claims data
    // count of allocations to be sure that the deal end epoch is correct
    if (contractCompletedDeals.length) {
      for (const deal of contractCompletedDeals) {
        const clientAllocationIds = await getClientAllocationIdsPerDeal(
          deal.dealId,
        );

        // get the deal time frame based on all allocations and count of allocations for the deal
        const allocationInfo =
          await dmobPrismaClient.unified_verified_deal.aggregate({
            where: {
              claimId: {
                in: clientAllocationIds,
              },
            },
            _min: {
              termStart: true,
            },
            _max: {
              termMax: true,
            },
            _count: {
              claimId: true,
            },
          });

        if (!allocationInfo._count.claimId) {
          claimTrackingLogger.info(
            `No allocation info found for deal ${deal.dealId}, skipping...`,
          );
          continue;
        }

        // IMPORTANT:
        // skip if mismatch in allocation count between expected and actual, to avoid setting wrong deal end epoch on validator contract
        if (allocationInfo._count.claimId !== clientAllocationIds.length) {
          claimTrackingLogger.info(
            `Mismatch in allocation count for deal ${deal.dealId} (expected: ${clientAllocationIds.length}, actual: ${allocationInfo._count.claimId}), skipping...`,
          );
          continue;
        }

        const dealStartEpoch = allocationInfo._min.termStart;
        const dealTermMax = allocationInfo._max.termMax;

        if (dealStartEpoch === null || dealTermMax === null) {
          claimTrackingLogger.info(
            `Incomplete allocation info for deal ${deal.dealId} (termStart: ${allocationInfo._min.termStart}, termMax: ${allocationInfo._max.termMax}), skipping...`,
          );
          continue;
        }

        const dealEndEpoch = dealStartEpoch + dealTermMax;

        await prismaClient.porep_market_deal.create({
          data: {
            dealId: deal.dealId,
            provider: deal.provider,
            client: deal.client,
            railId: deal.railId,
            validatorContractAddress: deal.validator,
            allocationsCount: allocationInfo._count.claimId,
            deal_start_epoch: dealStartEpoch,
            deal_end_epoch: dealEndEpoch,
            railTerminated: false,
          },
        });

        // set the deal end epoch on validator contract if the deal end epoch is in the future
        if (dealEndEpoch > currentBlock) {
          await setDealEndEpochOnValidatorContract(
            deal.dealId,
            BigInt(dealEndEpoch),
            deal.validator,
          );
          await modifyRailPaymentOnValidatorContract(
            deal.railId,
            deal.validator,
          );
        }
      }
    }

    // STEP 2: get all terminated deals from database and terminate rails on validator contract
    const dbTerminatedDeals = await prismaClient.porep_market_deal.findMany({
      where: {
        dealId: {
          in: contractCompletedDeals.map((deal) => deal.dealId),
        },
        deal_end_epoch: {
          lte: currentBlock,
        },
        railTerminated: false, // only get deals that are not yet marked as railTerminated in database to avoid double termination in case the job runs multiple times before the next block is produced after setting deal end epoch on validator contract
      },
    });

    // terminateRail
    if (dbTerminatedDeals.length) {
      claimTrackingLogger.info(
        `Found ${dbTerminatedDeals.length} terminated deals in database, start terminating rails...`,
      );

      for (const deal of dbTerminatedDeals) {
        claimTrackingLogger.info(
          `Terminating railId ${deal.railId} for deal ${deal.dealId} ...`,
        );

        await prismaClient.$transaction(
          async (tx) => {
            await terminateRailOnValidatorContract(
              deal.railId,
              deal.validatorContractAddress as Address,
            );

            await tx.porep_market_deal.update({
              where: {
                dealId: deal.dealId,
              },
              data: {
                railTerminated: true,
              },
            });
          },
          {
            timeout: 60000,
          },
        );
      }
    }
  } catch (err) {
    claimTrackingLogger.error({ err }, "Job failed");
  }

  claimTrackingLogger.info("Job finished");
}
