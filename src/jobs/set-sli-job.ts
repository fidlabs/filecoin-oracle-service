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

    const sliDataForProviders = await getSliForStorageProviders(
      slaContractProviders.map((sp) => `f0${sp.toString()}`),
    );

    if (sliDataForProviders.length === 0) {
      logger.info(
        "No SLI data fetched for any provider from CDP, skipping SLI update on oracle contract",
      );
      return;
    }

    // const sliDataForProviders: CdpSliResponse[] = [
    //   {
    //     storageProviderId: "f03315260",
    //     storageProviderName: "ProviderOne",
    //     updatedAt: new Date(),
    //     data: [
    //       {
    //         sliMetric: StorageProvidersSLIMetric.RPA_RETRIEVABILITY,
    //         sliMetricName: "RPA Retrievability",
    //         sliMetricValue: "99.12",
    //         sliMetricDescription: "Retrievability percentage",
    //         sliMetricUnit: "percent",
    //         updatedAt: new Date(),
    //       },
    //     ],
    //   },
    // ];

    await setSliOnOracleContract(sliDataForProviders);
  } catch (err) {
    logger.error({ err }, "Oracle job failed");
  }

  logger.info("Oracle job finished");
}
