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

    const lastSliForProvider =
      await getLastSliForDealsFromSliOracleContract(uniqueDeals);

    for (const deal of dealsToCalculateScore) {
      if (!deal.requirements) {
        sliChildLogger.warn(
          `Deal ${deal.onChainDealId} does not have requirements data, skipping score calculation for this deal`,
        );
        continue;
      }

      const lastSliForProviderValue = lastSliForProvider.find(
        (sli) => sli.onChainDealIds === deal.onChainDealId,
      )?.sliAttestation;

      if (!lastSliForProviderValue) {
        sliChildLogger.warn(
          `No SLI attestation found for deal ${deal.provider} on sli oracle contract, skipping score calculation for this deal`,
        );
        continue;
      }

      const scoreResult = await calculateScoreOnSliScorerContract(
        deal.provider,
        {
          retrievabilityBps: Number(deal.requirements?.retrievabilityBps),
          bandwidthBytesPerSecond: BigInt(
            deal.requirements?.bandwidthBytesPerSecond,
          ),
          latencyMs: Number(deal.requirements?.latencyMs),
          indexingPct: Number(deal.requirements?.indexingPct),
        },
      );

      dealScore.push({
        providerId: deal.provider,
        calculatedScore: scoreResult,
        porepMarketDealId: deal.id,
        averageBandwidthMbps: lastSliForProviderValue?.bandwidthBytesPerSecond
          ? BigInt(lastSliForProviderValue.bandwidthBytesPerSecond)
          : BigInt(0),
        averageRetrievabilityBps: lastSliForProviderValue?.retrievabilityBps
          ? BigInt(lastSliForProviderValue.retrievabilityBps)
          : BigInt(0),
        averageLatencyMs: lastSliForProviderValue?.latencyMs
          ? BigInt(lastSliForProviderValue.latencyMs)
          : BigInt(0),
        averageIndexingPct: lastSliForProviderValue?.indexingPct
          ? BigInt(lastSliForProviderValue.indexingPct)
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
  } finally {
    sliChildLogger.info("Job finished");
  }
}
