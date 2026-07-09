import { Address } from "viem";
import { isDataCapPostingFinishedOnDCEvidenceContract } from "../blockchain/datacap-evidence-adapter-contract";
import {
  activateEvidenceOnPoRepMarketContract,
  PorepMarketEvidenceTransactionResult,
  submitEvidenceBatchOnPoRepMarketContract,
} from "../blockchain/porep-market.contract";
import {
  getDealsToActivateDCEvidenceFromDb,
  setActivatePaymentAtInDb,
  storeOnChainTransactionToDb,
} from "../services/db/db-service";
import { PorepMarketDealDto } from "../services/db/dto/porep-market-deal.dto";
import {
  encodeEvidenceBatchData,
  getEvidenceBatchSizes,
  NO_ADDITIONAL_EVIDENCE_DATA,
} from "../utils/evidence-batch";
import { baseLogger } from "../utils/logger";
import { ContractEvidenceResult } from "../utils/types";

const datacapPostingFinishedLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[DataCap Posting Finished Job] " },
);

export async function dataCapPostingFinishedJob() {
  try {
    datacapPostingFinishedLogger.info("Job started");

    const deals: PorepMarketDealDto[] =
      await getDealsToActivateDCEvidenceFromDb();

    if (!deals.length) {
      datacapPostingFinishedLogger.info(
        "No Accepted deals found in local database to check DataCap posting",
      );
      return;
    }

    datacapPostingFinishedLogger.info(
      `Found ${deals.length} Accepted deals in local database to check DataCap posting`,
    );

    for (const deal of deals) {
      datacapPostingFinishedLogger.info(
        `Processing deal ${deal.onChainDealId}`,
      );

      const isPostingFinished =
        await isDataCapPostingFinishedOnDCEvidenceContract(
          deal.onChainDealId,
          deal.evidenceAdapterContractAddress as Address,
        );

      if (!isPostingFinished) {
        datacapPostingFinishedLogger.info(
          `DataCap posting is not finished for deal ${deal.onChainDealId}, skipping`,
        );
        continue;
      }

      const batchSizes = getEvidenceBatchSizes(deal.allocationsRequiredCount);

      if (!batchSizes.length) {
        datacapPostingFinishedLogger.info(
          `Deal ${deal.onChainDealId} has no required allocations count, skipping submitEvidenceBatch`,
        );
        continue;
      }

      const submitEvidenceBatchResults: PorepMarketEvidenceTransactionResult[] =
        [];

      for (const [batchIndex, batchSize] of batchSizes.entries()) {
        datacapPostingFinishedLogger.info(
          `Submitting evidence batch ${batchIndex + 1}/${batchSizes.length} for deal ${deal.onChainDealId} with batch size ${batchSize}`,
        );

        const submitEvidenceBatchResult =
          await submitEvidenceBatchOnPoRepMarketContract(
            deal.onChainDealId,
            encodeEvidenceBatchData(batchSize),
          );

        await storeOnChainTransactionToDb(
          deal.id,
          submitEvidenceBatchResult.transactionResult,
        );

        submitEvidenceBatchResults.push(submitEvidenceBatchResult);
      }

      const areAllBatchResultsAccepted = submitEvidenceBatchResults.every(
        (result) => result.decision.result === ContractEvidenceResult.Accepted,
      );

      if (!areAllBatchResultsAccepted) {
        datacapPostingFinishedLogger.info(
          `At least one evidence batch for deal ${deal.onChainDealId} was not accepted, skipping activateEvidence`,
        );
        continue;
      }

      datacapPostingFinishedLogger.info(
        `All evidence batch accepted for deal ${deal.onChainDealId}, activating evidence...`,
      );

      const activateEvidenceResult =
        await activateEvidenceOnPoRepMarketContract(
          deal.onChainDealId,
          NO_ADDITIONAL_EVIDENCE_DATA,
        );

      await storeOnChainTransactionToDb(
        deal.id,
        activateEvidenceResult.transactionResult,
      );

      datacapPostingFinishedLogger.info(
        `Evidence activated for deal ${deal.onChainDealId}, activating payment`,
      );

      await setActivatePaymentAtInDb(deal.onChainDealId);

      datacapPostingFinishedLogger.info(
        `Successfully processed DataCap evidence and payment activation flow for deal ${deal.onChainDealId}`,
      );
    }
  } catch (error) {
    datacapPostingFinishedLogger.error({ error }, "Job failed");
  } finally {
    datacapPostingFinishedLogger.info("Job finished");
  }
}
