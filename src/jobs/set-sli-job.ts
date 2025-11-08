import { getProvidersFromSlaAllocatorContract } from "../blockchain/sla-allocator-contract.js";
import { logger } from "../utils/logger.js";

export async function setSliOracleJob() {
  logger.info("Oracle job started");

  try {
    const slaContractProviders = await getProvidersFromSlaAllocatorContract(); // TODO: enable when SLA Allocator is ready
    // const sliDataForProviders = await getSliForStorageProviders(
    //   slaContractProviders.map(String),
    // ); // TODO: enable when CDP service is ready
    logger.info(
      `Fetched ${slaContractProviders} provider from SLA Allocator contract`,
    );
    //await setSliOnOracleContract(sliDataForProviders);
  } catch (err) {
    logger.error({ err }, "Oracle job failed");
  }

  logger.info("Oracle job finished");
}
