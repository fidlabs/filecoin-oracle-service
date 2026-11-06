import { setSliOnOracleContract } from "../blockchain/sli-oracle-contract";
import { getSliForDeals } from "../services/cdp-fetch-service";
import {
  getDealsToSetSliFromDb,
  storeOnChainTransactionToDb,
} from "../services/db/db-service";
import { baseLogger } from "../utils/logger";
import { CdpDealSliResponse, SliAttestation } from "../utils/types";
import { parseLatencyMs } from "../utils/sli";
import {
  SliAverages,
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

    const period = getSliPeriod();

    let sliDataForDeals: CdpDealSliResponse | null = null;
    let indexingFetchFailed = false;

    try {
      sliDataForDeals = await getSliForDeals(uniqueDealIds);
    } catch (err) {
      indexingFetchFailed = true;
      sliChildLogger.error(
        `Failed to fetch CDP indexing; continuing with URL Finder measurements: ${String(err).replace(/[\r\n]+/g, " ")}`,
      );
    }

    const buildedSliData: SliAttestation[] = [];

    for (const onChainDealId of uniqueDealIds) {
      let averages: SliAverages;

      try {
        const measurements = await getSliMeasurementsForDeal(
          onChainDealId,
          period,
        );

        averages = averageSliMeasurements(measurements, period);
      } catch (err) {
        sliChildLogger.error(
          `Failed to fetch URL Finder history; skipping SLI attestation: dealId=${onChainDealId}, from=${period.start.toISOString()}, to=${period.end.toISOString()}, error=${String(err).replace(/[\r\n]+/g, " ")}`,
        );
        continue;
      }

      const indexingValue =
        sliDataForDeals?.data?.[onChainDealId.toString()]?.INDEXING_PCT;

      if (indexingFetchFailed) {
        sliChildLogger.warn(
          `CDP request failed: dealId=${onChainDealId}, using indexingPct=0`,
        );
      }

      const indexingMetric =
        indexingValue === null ||
        indexingValue === undefined ||
        (typeof indexingValue === "string" && indexingValue.trim() === "")
          ? 0
          : Number(indexingValue);

      if (
        !Number.isFinite(indexingMetric) ||
        indexingMetric < 0 ||
        indexingMetric > 100
      ) {
        sliChildLogger.warn(
          `Invalid CDP indexing metric: dealId=${onChainDealId}, indexingPct=${indexingMetric}`,
        );
      }

      const sliAttestation: SliAttestation = {
        onChainDealId,
        slis: {
          retrievabilityBps: Math.floor(averages.retrievabilityBps ?? 0),
          bandwidthBytesPerSecond: convertMbpsToBytesPerSecond(
            (averages.bandwidthMbps ?? 0).toString(),
          ),
          indexingPct: Math.floor(indexingMetric),
          latencyMs: parseLatencyMs(averages.latencyMs),
        },
      };

      buildedSliData.push(sliAttestation);

      sliChildLogger.info(
        `SLI attestation prepared for setSLI (not yet submitted): dealId=${onChainDealId}, retrievabilityBps=${sliAttestation.slis.retrievabilityBps}, bandwidthBytesPerSecond=${sliAttestation.slis.bandwidthBytesPerSecond}, indexingPct=${sliAttestation.slis.indexingPct}, latencyMs=${sliAttestation.slis.latencyMs}`,
      );
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
    sliChildLogger.error(`Failed: ${String(err).replace(/[\r\n]+/g, " ")}`);
    throw err;
  } finally {
    sliChildLogger.info("Job finished");
  }
}
