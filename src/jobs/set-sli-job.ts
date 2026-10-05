import { setSliOnOracleContract } from "../blockchain/sli-oracle-contract";
import {
  getDealsToSetSliFromDb,
  storeOnChainTransactionToDb,
} from "../services/db/db-service";
import { baseLogger } from "../utils/logger";
import { SliAttestation } from "../utils/types";
import { calculateScoreJob } from "./calculate-score-job";

const sliChildLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SLI Job] " },
);

const FULL_SCORE_SLI_VALUES = {
  retrievabilityBps: 10_000,
  bandwidthBytesPerSecond: 2n ** 63n - 1n,
  latencyMs: 1,
  indexingPct: 100,
};

export async function setSliOracleJob() {
  try {
    sliChildLogger.info("Job started");

    const dealsToSetSli = await getDealsToSetSliFromDb();

    const uniqueDealIds = [
      ...new Set(dealsToSetSli.map((deal) => deal.onChainDealId)),
    ];

    if (uniqueDealIds.length === 0) {
      sliChildLogger.info("No deals found to set SLI, skipping SLI update");

      return;
    }

    sliChildLogger.info(
      `Extracted ${uniqueDealIds.length} unique of ${dealsToSetSli.length} all deals`,
    );

    sliChildLogger.info(
      `Preparing hardcoded full-score SLI data for ${uniqueDealIds.length} deals...`,
    );

    const buildedSliData: SliAttestation[] = uniqueDealIds.map(
      (onChainDealId) => ({
        onChainDealId: BigInt(onChainDealId),
        slis: FULL_SCORE_SLI_VALUES,
      }),
    );

    sliChildLogger.info(`Prepared SLI attestations for deals`);

    for (const sliAttestation of buildedSliData) {
      const transactionResult = await setSliOnOracleContract(sliAttestation);

      await storeOnChainTransactionToDb(
        sliAttestation.onChainDealId,
        transactionResult,
      );
    }

    sliChildLogger.info(
      `Finished setting SLI on oracle contract for deals, starting score calculation for deals based on new set SLI values...`,
    );

    await calculateScoreJob();

    sliChildLogger.info(`Finished calculating score for deals`);
  } catch (err) {
    sliChildLogger.error({ err }, "Failed");
    throw err;
  } finally {
    sliChildLogger.info("Job finished");
  }
}
