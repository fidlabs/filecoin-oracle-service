import { setSliOnOracleContract } from "../blockchain/sli-oracle-contract";
import { getSliForDeals } from "../services/cdp-fetch-service";
import {
  getDealsToSetSliFromDb,
  storeOnChainTransactionToDb,
} from "../services/db/db-service";
import { baseLogger } from "../utils/logger";
import { SliAttestation } from "../utils/types";
import { parseLatencyMs } from "../utils/sli";
import {
  averageSliMeasurements,
  getSliMeasurementsForDeal,
  getSliPeriod,
} from "../services/url-finder-sli-service";
import { calculateScoreJob } from "./calculate-score-job";

const sliChildLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SLI Job] " },
);

function convertMbpsToBytesPerSecond(bandwidthMbps?: string): bigint {
  const parsedBandwidthMbps = Number(bandwidthMbps);

  if (!Number.isFinite(parsedBandwidthMbps)) {
    return 0n;
  }

  return BigInt(Math.floor((parsedBandwidthMbps * 1_000_000) / 8));
}

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

    // Capture one shared window so every deal uses the same measurement period.
    const period = getSliPeriod();
    const sliDataForDeals = await getSliForDeals(uniqueDealIds);
    const buildedSliData: SliAttestation[] = [];

    for (const onChainDealId of uniqueDealIds) {
      const indexingValue =
        sliDataForDeals?.data[onChainDealId.toString()]?.INDEXING_PCT;

      const indexingMetric = Number(indexingValue);
      if (
        indexingValue === null ||
        indexingValue === undefined ||
        (typeof indexingValue === "string" && indexingValue.trim() === "") ||
        !Number.isFinite(indexingMetric) ||
        indexingMetric < 0 ||
        indexingMetric > 1
      ) {
        sliChildLogger.warn(
          { onChainDealId },
          "Missing or invalid CDP indexing metric; skipping SLI attestation",
        );
        continue;
      }

      const measurements = await getSliMeasurementsForDeal(
        onChainDealId,
        period,
      );
      const averages = averageSliMeasurements(measurements, period);
      if (
        averages.retrievabilityBps === null ||
        averages.bandwidthMbps === null ||
        averages.latencyMs === null
      ) {
        sliChildLogger.warn(
          { onChainDealId },
          "Incomplete URL Finder measurements for SLI period; skipping attestation",
        );
        continue;
      }

      buildedSliData.push({
        onChainDealId,
        slis: {
          retrievabilityBps: Math.floor(averages.retrievabilityBps),
          bandwidthBytesPerSecond: convertMbpsToBytesPerSecond(
            averages.bandwidthMbps.toString(),
          ),
          indexingPct: Math.floor(indexingMetric * 100),
          latencyMs: parseLatencyMs(averages.latencyMs),
        },
      });
    }

    if (buildedSliData.length === 0) {
      sliChildLogger.info(
        "No complete SLI attestations available for the measurement period",
      );
      return;
    }

    for (const sliAttestation of buildedSliData) {
      const transactionResult = await setSliOnOracleContract(sliAttestation);

      await storeOnChainTransactionToDb(
        sliAttestation.onChainDealId,
        transactionResult,
      );
    }

    sliChildLogger.info(
      `Finished setting SLI on oracle contract for providers, starting score calculation for providers based on new set SLI values...`,
    );

    await calculateScoreJob();

    sliChildLogger.info(`Finished calculating score for providers`);
  } catch (err) {
    sliChildLogger.error({ err }, "Failed");
    throw err;
  } finally {
    sliChildLogger.info("Job finished");
  }
}
