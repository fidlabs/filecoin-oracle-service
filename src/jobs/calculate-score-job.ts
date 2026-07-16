import { getLastSliForDealsFromSliOracleContract } from "../blockchain/sli-oracle-contract";
import { calculateScoreOnSliScorerContract } from "../blockchain/sli-scorer-contract";
import {
  getDealsToCalculateScoreFromDb,
  storeDealsScoreToDb,
} from "../services/db/db-service";
import { baseLogger } from "../utils/logger";
import { DealScore } from "../utils/types";

const sliChildLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Calculate Score Job] " },
);

export async function calculateScoreJob() {
  try {
    sliChildLogger.info("Job started");

    const dealsToCalculateScore = await getDealsToCalculateScoreFromDb();

    if (dealsToCalculateScore.length === 0) {
      sliChildLogger.info(
        "No deals found in database that require score calculation. Job will exit.",
      );

      return;
    }

    sliChildLogger.info(
      `Found ${dealsToCalculateScore.length} deals in database to calculate score`,
    );

    const dealScore: DealScore[] = [];

    const uniqueDeals = [
      ...new Set(dealsToCalculateScore.map((deal) => deal.onChainDealId)),
    ];

    sliChildLogger.info(
      `Extracted ${uniqueDeals.length} unique deals from ${dealsToCalculateScore.length} deals to calculate score for`,
    );

    const lastSliForDeal =
      await getLastSliForDealsFromSliOracleContract(uniqueDeals);

    for (const deal of dealsToCalculateScore) {
      if (!deal.requiredSLIs) {
        sliChildLogger.warn(
          `Deal ${deal.onChainDealId} does not have required SLIs data, skipping score calculation for this deal`,
        );
        continue;
      }

      const lastSliForDealValue = lastSliForDeal.find(
        (sli) => sli.onChainDealIds === deal.onChainDealId,
      )?.sliAttestation;

      if (!lastSliForDealValue) {
        sliChildLogger.warn(
          `No SLI attestation found for deal ${deal.id} on sli oracle contract, skipping score calculation for this deal`,
        );
        continue;
      }

      const scoreResult = await calculateScoreOnSliScorerContract(
        deal.onChainDealId,
        {
          retrievabilityBps: Number(deal.requiredSLIs?.retrievabilityBps),
          bandwidthBytesPerSecond: BigInt(
            deal.requiredSLIs?.bandwidthBytesPerSecond,
          ),
          latencyMs: Number(deal.requiredSLIs?.latencyMs),
          indexingPct: Number(deal.requiredSLIs?.indexingPct),
        },
      );

      dealScore.push({
        calculatedScore: scoreResult,
        porepMarketDealId: deal.id,
        averageBandwidthMbps: lastSliForDealValue?.bandwidthBytesPerSecond
          ? BigInt(lastSliForDealValue.bandwidthBytesPerSecond)
          : BigInt(0),
        averageRetrievabilityBps: lastSliForDealValue?.retrievabilityBps
          ? BigInt(lastSliForDealValue.retrievabilityBps)
          : BigInt(0),
        averageLatencyMs: lastSliForDealValue?.latencyMs
          ? BigInt(lastSliForDealValue.latencyMs)
          : BigInt(0),
        averageIndexingPct: lastSliForDealValue?.indexingPct
          ? BigInt(lastSliForDealValue.indexingPct)
          : BigInt(0),
      });
    }

    sliChildLogger.info(
      `Calculated score for ${dealScore.length} deals, storing results to DB...`,
    );

    await storeDealsScoreToDb(dealScore);

    sliChildLogger.info(`Stored deals scores to DB`);
  } catch (err) {
    sliChildLogger.error({ err }, "Failed");
    throw err;
  } finally {
    sliChildLogger.info("Job finished");
  }
}
