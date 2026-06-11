import {
  getDealsFromPoRepMarketContract,
  rejectExpiredDealOnPoRepMarketContract,
} from "../blockchain/porep-market.contract";
import {
  getDealsFromDb,
  storeOnChainTransactionToDb,
} from "../services/db/db-service";
import { baseLogger } from "../utils/logger";
import { PorepMarketContractDealState } from "../utils/types";

const rejectExpiredDealChildLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Reject Expired Deal Job] " },
);

export async function runRejectExpiredDealJob() {
  try {
    rejectExpiredDealChildLogger.info("Job started...");

    const onChainDeals = await getDealsFromPoRepMarketContract();

    const proposedDeals = onChainDeals.filter(
      (deal) => deal.state === PorepMarketContractDealState.Proposed,
    );

    if (proposedDeals.length === 0) {
      rejectExpiredDealChildLogger.info(
        "No deals in Proposed state found on chain, skipping expired deal rejection process",
      );
      return [];
    }

    rejectExpiredDealChildLogger.info(
      `Found ${proposedDeals.length} potentially expired deals in Proposed state on chain, checking if any of them have expired...`,
    );

    const proposedDealIds = proposedDeals.map((deal) => deal.dealId);

    const dbDeals = await getDealsFromDb(proposedDealIds);

    for (const onChainDeal of proposedDeals) {
      rejectExpiredDealChildLogger.info(
        `Processing potentially expired deal with ID ${onChainDeal.dealId}`,
      );

      const dbDeal = dbDeals.find(
        (deal) => deal.onChainDealId === onChainDeal.dealId,
      );

      if (!dbDeal) {
        rejectExpiredDealChildLogger.info(
          `No corresponding deal found in database for on-chain deal with ID ${onChainDeal.dealId}, skipping storing transaction result to database`,
        );
        continue;

        // the deal not synced with the database yet, it will be processed in the next job run, skipping for now to avoid storing transaction result without linking it to a deal in the database
      }

      const transactionResult = await rejectExpiredDealOnPoRepMarketContract(
        onChainDeal.dealId,
      );

      await storeOnChainTransactionToDb(dbDeal.id, transactionResult);

      rejectExpiredDealChildLogger.info(
        `Successfully processed potentially expired deal with ID ${onChainDeal.dealId}`,
      );
    }
  } catch (error) {
    rejectExpiredDealChildLogger.error({ error }, "Job failed");
  } finally {
    rejectExpiredDealChildLogger.info("Job finished");
  }
}
