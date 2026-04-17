import { setSliOnOracleContract } from "../blockchain/sli-oracle-contract";
import { getProvidersFromSPRegistryContract } from "../blockchain/sp-registry-contract";
import { getSliForStorageProviders } from "../services/cdp-fetch-service";
import { baseLogger } from "../utils/logger";
import {
  SliAttestation,
  StorageProvidersSliData,
  StorageProvidersSliMetricType,
} from "../utils/types";
import { calculateScoreJob } from "./calculate-score-job";

const sliChildLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SLI Job] " },
);

export async function setSliOracleJob() {
  try {
    sliChildLogger.info("Job started");

    const storageProviders = await getProvidersFromSPRegistryContract();

    const uniqueStorageProviders = [...new Set(storageProviders)];

    if (uniqueStorageProviders.length === 0) {
      sliChildLogger.info(
        "No storage providers found in SP Registry contract, skipping SLI update on oracle contract",
      );

      return;
    }

    sliChildLogger.info(
      `Extracted ${uniqueStorageProviders.length} unique of ${storageProviders.length} all storage providers`,
    );

    const sps = uniqueStorageProviders.map((sp) => `f0${sp.toString()}`);

    const sliDataForProviders = await getSliForStorageProviders(sps);
    const providersSlis = Object.values(sliDataForProviders?.data || {});

    if (providersSlis.length === 0 || !sliDataForProviders) {
      sliChildLogger.info(
        "No SLI data fetched for any provider from CDP, skipping SLI update on oracle contract",
      );
      return;
    }

    sliChildLogger.info(
      `Fetched SLI data for ${providersSlis.length} providers from CDP`,
    );

    sliChildLogger.info(`Preparing SLI data for providers...`);

    const buildedSliData: SliAttestation[] = Object.entries(
      sliDataForProviders.data,
    ).map(([storageProviderId, data]) => {
      const retrievability =
        Number(
          data.find(
            (d: StorageProvidersSliData) =>
              d.sliMetricType ===
              StorageProvidersSliMetricType.RPA_RETRIEVABILITY,
          )?.sliMetricValue,
        ) || 0;
      const indexingMetric =
        Number(
          data.find(
            (d: StorageProvidersSliData) =>
              d.sliMetricType === StorageProvidersSliMetricType.IPNI_REPORTING,
          )?.sliMetricValue,
        ) || 0;

      const latencyMetric =
        Number(
          data.find(
            (d: StorageProvidersSliData) =>
              d.sliMetricType === StorageProvidersSliMetricType.TTFB,
          )?.sliMetricValue,
        ) || 0;

      const bandwidthMetric =
        Number(
          data
            .find(
              (d: StorageProvidersSliData) =>
                d.sliMetricType === StorageProvidersSliMetricType.BANDWIDTH,
            )
            ?.sliMetricValue?.split(".")[0],
        ) || 0;

      const sliAttestation: SliAttestation = {
        provider: storageProviderId.startsWith("f0")
          ? BigInt(storageProviderId.slice(2))
          : BigInt(storageProviderId),
        slis: {
          retrievabilityBps:
            retrievability !== null ? Math.floor(retrievability * 10000) : 0,
          indexingPct: Math.floor(indexingMetric * 100),
          latencyMs: latencyMetric,
          bandwidthMbps: bandwidthMetric,
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
