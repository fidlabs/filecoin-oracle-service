import {
  getDealsFromPoRepMarketContract,
  rejectExpiredDealOnPoRepMarketContract,
} from "../blockchain/porep-market.contract";
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

    for (const onChainDealId of proposedDealIds) {
      rejectExpiredDealChildLogger.info(
        `Processing potentially expired deal with ID ${onChainDealId}`,
      );

      await rejectExpiredDealOnPoRepMarketContract(onChainDealId);

      rejectExpiredDealChildLogger.info(
        `Successfully processed potentially expired deal with ID ${onChainDealId}`,
      );
    }
  } catch (error) {
    rejectExpiredDealChildLogger.error({ error }, "Job failed");
  } finally {
    rejectExpiredDealChildLogger.info("Job finished");
  }
}
