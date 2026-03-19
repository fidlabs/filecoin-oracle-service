import { setSliOnOracleContract } from "../blockchain/sli-oracle-contract";
import { getProvidersFromSPRegistryContract } from "../blockchain/sp-registry-contract";
import { getSliForStorageProviders } from "../services/cdp-fetch-service";
import { baseLogger } from "../utils/logger";

const sliChildLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SLI Job] " },
);

export async function setSliOracleJob() {
  sliChildLogger.info("Started");

  try {
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

    await setSliOnOracleContract(sliDataForProviders.data);
  } catch (err) {
    sliChildLogger.error({ err }, "Failed");
  }

  sliChildLogger.info("Finished");
}
