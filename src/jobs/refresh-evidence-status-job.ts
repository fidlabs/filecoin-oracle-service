import {
  PorepMarketEvidenceStatusTransactionResult,
  refreshEvidenceStatusOnPoRepMarketContract,
} from "../blockchain/porep-market.contract";
import {
  getDealsToRefreshEvidenceStatusFromDb,
  storeOnChainTransactionToDb,
  upsertEvidenceStatusInDb,
} from "../services/db/db-service";
import { EvidenceResult } from "../services/db/deal-status.db";
import {
  encodeEvidenceBatchData,
  getEvidenceBatchSizes,
} from "../utils/evidence-batch";
import { baseLogger } from "../utils/logger";

const refreshEvidenceStatusLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Refresh Evidence Status Job] " },
);

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

        const batchSizes = getEvidenceBatchSizes(deal.allocationsRequiredCount);

        if (!batchSizes.length) {
          refreshEvidenceStatusLogger.info(
            `Deal ${deal.onChainDealId} has no required allocations count, skipping refreshEvidenceStatus`,
          );
          continue;
        }

        const refreshEvidenceStatusResults: PorepMarketEvidenceStatusTransactionResult[] =
          [];

        for (const [batchIndex, batchSize] of batchSizes.entries()) {
          refreshEvidenceStatusLogger.info(
            `Refreshing evidence status batch ${batchIndex + 1}/${batchSizes.length} for deal ${deal.onChainDealId} with batch size ${batchSize}`,
          );

          const refreshEvidenceStatusResult =
            await refreshEvidenceStatusOnPoRepMarketContract(
              deal.onChainDealId,
              encodeEvidenceBatchData(batchSize),
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

          refreshEvidenceStatusResults.push(refreshEvidenceStatusResult);
        }

        const areAllBatchResultsAccepted = refreshEvidenceStatusResults.every(
          (result) => result.status.result === EvidenceResult.Accepted,
        );

        if (!areAllBatchResultsAccepted) {
          refreshEvidenceStatusLogger.info(
            `At least one evidence status batch for deal ${deal.onChainDealId} was not accepted`,
          );
          continue;
        }

        refreshEvidenceStatusLogger.info(
          {
            statuses: refreshEvidenceStatusResults.map(
              (result) => result.status,
            ),
          },
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
