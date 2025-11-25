import { getProvidersFromSlaAllocatorContract } from "../blockchain/sla-allocator-contract.js";
import { setSliOnOracleContract } from "../blockchain/sli-oracle-contract.js";
import { getSliForStorageProviders } from "../services/cdp-fetch-service.js";
import { logger } from "../utils/logger.js";

export async function setSliOracleJob() {
  logger.info("Oracle job started");

  try {
    const slaContractProviders = await getProvidersFromSlaAllocatorContract();

    if (slaContractProviders.length === 0) {
      logger.info(
        "No storage providers found in SLA Allocator contract, skipping SLI update on oracle contract",
      );
      return;
    }

    const sps = slaContractProviders.map((sp) => `f0${sp.toString()}`);

    logger.info(`SPS inputs ${sps.join(", ")}`);

    const sliDataForProviders = await getSliForStorageProviders(sps);

    if (sliDataForProviders.length === 0) {
      logger.info(
        "No SLI data fetched for any provider from CDP, skipping SLI update on oracle contract",
      );
      return;
    }

    await setSliOnOracleContract(sliDataForProviders);
  } catch (err) {
    logger.error({ err }, "Oracle job failed");
  }

  logger.info("Oracle job finished");
}
