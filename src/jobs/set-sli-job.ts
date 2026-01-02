import { getProvidersFromSlaAllocatorContract } from "../blockchain/sla-allocator-contract.js";
import { setSliOnOracleContract } from "../blockchain/sli-oracle-contract.js";
import { getSliForStorageProviders } from "../services/cdp-fetch-service.js";
import { baseLogger } from "../utils/logger.js";

const sliChildLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SLI Job] " },
);

export async function setSliOracleJob() {
  sliChildLogger.info("Started");

  try {
    const slaContractProviders = await getProvidersFromSlaAllocatorContract();

    if (slaContractProviders.length === 0) {
      sliChildLogger.info(
        "No storage providers found in SLA Allocator contract, skipping SLI update on oracle contract",
      );
      return;
    }

    const sps = slaContractProviders.map((sp) => `f0${sp.toString()}`);

    sliChildLogger.info(`SPS inputs ${sps.join(", ")}`);

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
