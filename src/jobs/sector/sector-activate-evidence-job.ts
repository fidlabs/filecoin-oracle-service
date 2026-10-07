import { getRpcClient } from "../../blockchain/blockchain-client";
import { activateEvidenceOnPoRepMarketContract } from "../../blockchain/porep-market.contract";
import {
  getSectorDealsToActivateEvidenceFromDb,
  setActivatePaymentAtInDb,
  storeOnChainTransactionToDb,
} from "../../services/db/db-service";
import { NO_ADDITIONAL_EVIDENCE_DATA } from "../../utils/evidence-batch";
import { baseLogger } from "../../utils/logger";
import { ContractEvidenceResult } from "../../utils/types";

const sectorActivateEvidenceLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Sector Activate Evidence Job] " },
);

export async function sectorActivateEvidenceJob() {
  try {
    sectorActivateEvidenceLogger.info("Job started");

    const deals = await getSectorDealsToActivateEvidenceFromDb();

    if (!deals.length) {
      sectorActivateEvidenceLogger.info(
        "No Accepted Sector deals found in local database to activate evidence",
      );
      return;
    }

    sectorActivateEvidenceLogger.info(
      `Found ${deals.length} Accepted Sector deals in local database to check piece placements`,
    );

    const currentEpoch = await getRpcClient().getBlockNumber();

    for (const deal of deals) {
      try {
        const receipt = deal.sectorAdapter!.receipt!;
        const terms = deal.terms!;

        const commitmentMarginEpochs =
          receipt.minimumCommitmentEpoch -
          (currentEpoch + terms.durationEpochs);

        sectorActivateEvidenceLogger.info(
          `Deal ${deal.onChainDealId} sector commitment margin: ${commitmentMarginEpochs} epochs`,
        );

        const activateEvidenceResult =
          await activateEvidenceOnPoRepMarketContract(
            deal.onChainDealId,
            NO_ADDITIONAL_EVIDENCE_DATA,
          );

        if (
          activateEvidenceResult.decision?.result !==
          ContractEvidenceResult.Accepted
        ) {
          sectorActivateEvidenceLogger.info(
            `Sector evidence for deal ${deal.onChainDealId} was not accepted (result ${activateEvidenceResult.decision?.result}), skipping activateEvidence`,
          );
          continue;
        }

        await storeOnChainTransactionToDb(
          deal.onChainDealId,
          activateEvidenceResult.transactionResult,
        );

        await setActivatePaymentAtInDb(deal.onChainDealId);

        sectorActivateEvidenceLogger.info(
          `Evidence activated for deal ${deal.onChainDealId}, covered bytes: ${activateEvidenceResult.decision.coveredBytes}`,
        );
      } catch (error) {
        sectorActivateEvidenceLogger.error(
          { error, onChainDealId: deal.onChainDealId },
          `Failed to activate evidence for deal ${deal.onChainDealId}`,
        );
      }
    }
  } catch (error) {
    sectorActivateEvidenceLogger.error({ error }, "Job failed");
    throw error;
  } finally {
    sectorActivateEvidenceLogger.info("Job finished");
  }
}
