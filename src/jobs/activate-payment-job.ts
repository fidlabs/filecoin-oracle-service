import { getRpcClient } from "../blockchain/blockchain-client";
import { activatePaymentOnPoRepMarketContract } from "../blockchain/porep-market.contract";
import {
  getCompletedDealsToActivatePayment,
  storeOnChainTransactionToDb,
} from "../services/db/db-service";
import { getPrismaClient } from "../services/prisma-service";
import { baseLogger } from "../utils/logger";

const activatePaymentLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Activate Payment Job] " },
);

export async function activatePaymentJob() {
  try {
    activatePaymentLogger.info("Job started");

    const prismaClient = getPrismaClient();

    const rpcClient = getRpcClient();
    const currentBlock = await rpcClient.getBlockNumber();

    const dealsToActivatePayment =
      await getCompletedDealsToActivatePayment(currentBlock);

    if (dealsToActivatePayment.length === 0) {
      activatePaymentLogger.info(
        "No completed deals found in database that require payment activation. Job will exit.",
      );

      return;
    }

    activatePaymentLogger.info(
      `Found ${dealsToActivatePayment.length} deals in database to activate payment, start processing...`,
    );

    for (const deal of dealsToActivatePayment) {
      activatePaymentLogger.info(
        `Activating payment on PoRep Market contract for deal ${deal.onChainDealId} and railId ${deal.railId}...`,
      );

      if (deal.dealEndEpoch) {
        const activatePaymentTransactionResult =
          await activatePaymentOnPoRepMarketContract(deal.onChainDealId);

        await storeOnChainTransactionToDb(
          deal.id,
          activatePaymentTransactionResult,
        );

        await prismaClient.porep_market_deal.update({
          where: {
            onChainDealId: deal.onChainDealId,
          },
          data: {
            activatePaymentAt: new Date(),
          },
        });
      }

      activatePaymentLogger.info(
        `Successfully activated payment for deal ${deal.onChainDealId} and railId ${deal.railId}`,
      );
    }
  } catch (err) {
    activatePaymentLogger.error({ err }, "Job failed");
  } finally {
    activatePaymentLogger.info("Job finished");
  }
}
