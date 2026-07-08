import { refreshEvidenceStatusOnPoRepMarketContract } from "../blockchain/porep-market.contract";
import {
  getDealsToRefreshEvidenceStatusFromDb,
  storeOnChainTransactionToDb,
  upsertEvidenceStatusInDb,
} from "../services/db/db-service";
import { baseLogger } from "../utils/logger";

const refreshEvidenceStatusLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Refresh Evidence Status Job] " },
);

const NO_ADDITIONAL_EVIDENCE_DATA = "0x";

export async function refreshEvidenceStatusJob() {
  try {
    refreshEvidenceStatusLogger.info("Job started");

    const deals = await getDealsToRefreshEvidenceStatusFromDb();

    if (!deals.length) {
      refreshEvidenceStatusLogger.info(
        "No Active deals found in local database to refresh evidence status",
      );
      return;
    }

    refreshEvidenceStatusLogger.info(
      `Found ${deals.length} Active deals in local database to refresh evidence status`,
    );

    for (const deal of deals) {
      try {
        refreshEvidenceStatusLogger.info(
          `Refreshing evidence status for deal ${deal.onChainDealId}`,
        );

        const refreshEvidenceStatusResult =
          await refreshEvidenceStatusOnPoRepMarketContract(
            deal.onChainDealId,
            NO_ADDITIONAL_EVIDENCE_DATA,
          );

        await storeOnChainTransactionToDb(
          deal.id,
          refreshEvidenceStatusResult.transactionResult,
        );

        await upsertEvidenceStatusInDb({
          onChainDealId: deal.onChainDealId,
          porepMarketDealId: deal.id,
          evidenceStatus: refreshEvidenceStatusResult.status,
        });

        refreshEvidenceStatusLogger.info(
          { status: refreshEvidenceStatusResult.status },
          `Successfully refreshed evidence status for deal ${deal.onChainDealId}`,
        );
      } catch (error) {
        refreshEvidenceStatusLogger.error(
          { error, onChainDealId: deal.onChainDealId },
          `Failed to refresh evidence status for deal ${deal.onChainDealId}`,
        );
      }
    }
  } catch (error) {
    refreshEvidenceStatusLogger.error({ error }, "Job failed");
  } finally {
    refreshEvidenceStatusLogger.info("Job finished");
  }
}
