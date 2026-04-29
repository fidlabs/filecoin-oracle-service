import { getLastSliForProviderFromSliOracleContract } from "../blockchain/sli-oracle-contract";
import { calculateScoreOnSliScorerContract } from "../blockchain/sli-scorer-contract";
import {
  getDealsToCalculateScoreFromDb,
  storeProviderScoreToDb,
} from "../services/db-service";
import { baseLogger } from "../utils/logger";
import { ProviderScore } from "../utils/types";

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

    const providerScore: ProviderScore[] = [];

    const uniqueProviders = [
      ...new Set(dealsToCalculateScore.map((deal) => deal.provider)),
    ];

    sliChildLogger.info(
      `Extracted ${uniqueProviders.length} unique providers from ${dealsToCalculateScore.length} deals get last attestations`,
    );

    const lastSliForProvider =
      await getLastSliForProviderFromSliOracleContract(uniqueProviders);

    for (const deal of dealsToCalculateScore) {
      if (!deal.requirements) {
        sliChildLogger.warn(
          `Deal ${deal.onChainDealId} does not have requirements data, skipping score calculation for this deal`,
        );
        continue;
      }

      const lastSliForProviderValue = lastSliForProvider.find(
        (sli) => sli.providerId === deal.provider,
      )?.sliAttestation;

      if (!lastSliForProviderValue) {
        sliChildLogger.warn(
          `No SLI attestation found for provider ${deal.provider} on sli oracle contract, skipping score calculation for this deal`,
        );
        continue;
      }

      const scoreResult = await calculateScoreOnSliScorerContract(
        deal.provider,
        {
          retrievabilityBps: Number(deal.requirements?.retrievabilityBps),
          bandwidthMbps: Number(deal.requirements?.bandwidthMbps),
          latencyMs: Number(deal.requirements?.latencyMs),
          indexingPct: Number(deal.requirements?.indexingPct),
        },
      );

      providerScore.push({
        providerId: deal.provider,
        calculatedScore: scoreResult,
        porepMarketDealId: deal.id,
        averageBandwidthMbps: lastSliForProviderValue?.bandwidthMbps
          ? BigInt(lastSliForProviderValue.bandwidthMbps)
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
      `Calculated score for ${providerScore.length} providers, storing results to DB...`,
    );

    await storeProviderScoreToDb(providerScore);

    sliChildLogger.info(`Stored provider scores to DB`);
  } catch (err) {
    sliChildLogger.error({ err }, "Failed");
  } finally {
    sliChildLogger.info("Job finished");
  }
}
