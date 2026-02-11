import { setSliOnOracleContract } from "../blockchain/sli-oracle-contract.js";
import { getProvidersFromSPRegistryContract } from "../blockchain/sp-registry-contract.js";
import { getSliForStorageProviders } from "../services/cdp-fetch-service.js";
import { baseLogger } from "../utils/logger.js";

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

    if (sliDataForProviders.length === 0) {
      sliChildLogger.info(
        "No SLI data fetched for any provider from CDP, skipping SLI update on oracle contract",
      );
      return;
    }

    sliChildLogger.info(
      `Fetched SLI data for ${sliDataForProviders.length} providers from CDP`,
    );

    await setSliOnOracleContract(sliDataForProviders);
  } catch (err) {
    sliChildLogger.error({ err }, "Failed");
  }

  sliChildLogger.info("Finished");
}
