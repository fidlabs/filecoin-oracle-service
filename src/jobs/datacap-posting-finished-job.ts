import { Address } from "viem";
import { isDataCapPostingFinishedOnDCEvidenceContract } from "../blockchain/datacap-evidence-adapter-contract";
import {
  activateEvidenceOnPoRepMarketContract,
  submitEvidenceBatchOnPoRepMarketContract,
} from "../blockchain/porep-market.contract";
import {
  getAcceptedDealsToActivateDatacapEvidenceFromDb,
  setActivatePaymentAtInDb,
  storeOnChainTransactionToDb,
} from "../services/db/db-service";
import { PorepMarketDealDto } from "../services/db/dto/porep-market-deal.dto";
import { baseLogger } from "../utils/logger";
import { EvidenceResult } from "../utils/types";

const datacapPostingFinishedLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[DataCap Posting Finished Job] " },
);

const NO_ADDITIONAL_EVIDENCE_DATA = "0x";

export async function dataCapPostingFinishedJob() {
  try {
    datacapPostingFinishedLogger.info("Job started");

    const deals: PorepMarketDealDto[] =
      await getAcceptedDealsToActivateDatacapEvidenceFromDb();

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

      const submitEvidenceBatchResult =
        await submitEvidenceBatchOnPoRepMarketContract(
          deal.onChainDealId,
          NO_ADDITIONAL_EVIDENCE_DATA,
        );

      await storeOnChainTransactionToDb(
        deal.id,
        submitEvidenceBatchResult.transactionResult,
      );

      if (
        submitEvidenceBatchResult.decision.result !== EvidenceResult.Accepted
      ) {
        datacapPostingFinishedLogger.info(
          {
            decision: submitEvidenceBatchResult.decision,
          },
          `Evidence batch for deal ${deal.onChainDealId} was not accepted, skipping activateEvidence`,
        );
        continue;
      }

      datacapPostingFinishedLogger.info(
        `Evidence batch accepted for deal ${deal.onChainDealId}, activating evidence`,
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
        {
          submitEvidenceBatchDecision: submitEvidenceBatchResult.decision,
          activateEvidenceDecision: activateEvidenceResult.decision,
        },
        `Successfully processed DataCap evidence and payment activation flow for deal ${deal.onChainDealId}`,
      );
    }
  } catch (error) {
    datacapPostingFinishedLogger.error({ error }, "Job failed");
  } finally {
    datacapPostingFinishedLogger.info("Job finished");
  }
}
