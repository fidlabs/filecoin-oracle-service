import { setSliOnOracleContract } from "../blockchain/sli-oracle-contract";
import { getSliForDeals } from "../services/cdp-fetch-service";
import { getDealsToSetSliFromDb } from "../services/db/db-service";
import { baseLogger } from "../utils/logger";
import { SliAttestation } from "../utils/types";
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

    const sliDataForDeals = await getSliForDeals(uniqueDealIds);

    const dealsSlis = Object.values(sliDataForDeals?.data || {});

    if (dealsSlis.length === 0 || !sliDataForDeals) {
      sliChildLogger.info(
        "No SLI data fetched for any deals from CDP, skipping SLI update",
      );
      return;
    }

    sliChildLogger.info(
      `Fetched SLI data for ${dealsSlis.length} providers from CDP`,
    );

    sliChildLogger.info(`Preparing SLI data for providers...`);

    const buildedSliData: SliAttestation[] = Object.entries(
      sliDataForDeals.data,
    ).map(([onChainDealId, sliData]) => {
      const retrievabilityMetric = Number(sliData.RETRIEVABILITY_BPS ?? 0);
      const indexingMetric = Number(sliData.INDEXING_PCT ?? 0);
      const latencyMetric = Number(sliData.LATENCY_MS ?? 0);
      const bandwidthBytesPerSecondMetric = sliData.BANDWIDTH_MBPS ?? 0;

      const sliAttestation: SliAttestation = {
        onChainDealId: BigInt(onChainDealId),
        slis: {
          retrievabilityBps:
            retrievabilityMetric !== null
              ? Math.floor(retrievabilityMetric * 10000)
              : 0,
          bandwidthBytesPerSecond: convertMbpsToBytesPerSecond(
            bandwidthBytesPerSecondMetric.toString(),
          ),
          indexingPct: Math.floor(indexingMetric * 100),
          latencyMs: latencyMetric,
        },
      };

      return sliAttestation;
    });

    sliChildLogger.info(`Prepared SLI attestation for providers`);

    await setSliOnOracleContract(buildedSliData);

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
