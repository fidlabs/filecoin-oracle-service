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

    const sliDataForDeals = await getSliForDeals(uniqueDealIds); //TODO: move to the new endpoint to track sli per deal instead of per provider
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
    ).map(([onChainDealId]) => {
      // const retrievability =
      //   Number(
      //     data.find(
      //       (d: StorageProvidersSliData) =>
      //         d.sliMetricType ===
      //         StorageProvidersSliMetricType.RPA_RETRIEVABILITY,
      //     )?.sliMetricValue,
      //   ) || 0;
      // const indexingMetric =
      //   Number(
      //     data.find(
      //       (d: StorageProvidersSliData) =>
      //         d.sliMetricType === StorageProvidersSliMetricType.IPNI_REPORTING,
      //     )?.sliMetricValue,
      //   ) || 0;

      // const latencyMetric =
      //   Number(
      //     data.find(
      //       (d: StorageProvidersSliData) =>
      //         d.sliMetricType === StorageProvidersSliMetricType.TTFB,
      //     )?.sliMetricValue,
      //   ) || 0;

      // const bandwidthMetric =
      //   Number(
      //     data
      //       .find(
      //         (d: StorageProvidersSliData) =>
      //           d.sliMetricType === StorageProvidersSliMetricType.BANDWIDTH,
      //       )
      //       ?.sliMetricValue?.split(".")[0],
      //   ) || 0;

      const sliAttestation: SliAttestation = {
        onChainDealId: BigInt(onChainDealId),
        slis: {
          retrievabilityBps: 5000,
          bandwidthBytesPerSecond: 100n,
          latencyMs: 30000,
          indexingPct: 0,
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
  } finally {
    sliChildLogger.info("Job finished");
  }
}
