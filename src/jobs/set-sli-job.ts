import { setSliOnOracleContract } from "../blockchain/sli-oracle-contract.js";
import { logger } from "../utils/logger.js";
import { CdpSliResponse } from "../utils/types.js";

export async function setSliOracleJob() {
  logger.info("Oracle job started");

  try {
    // const slaContractProviders = await getProvidersFromSlaAllocatorContract(); // TODO: enable when SLA Allocator is ready
    // const sliDataForProviders = await getSliForStorageProviders(
    //   slaContractProviders.map(String)
    // ); // TODO: enable when CDP service is ready

    // Temporary hardcoded data for testing
    const sliDataForProviders: CdpSliResponse[] = [
      {
        provider: "0xff000000000000000000000000000000001e5997", //f01989015
        sli: {
          lastUpdate: BigInt(Math.floor(Date.now() / 1000)),
          availability: 1,
          latency: 1,
          indexing: 1,
          retention: 1,
          bandwidth: 1,
          stability: 1,
        },
      },
      {
        provider: "0xff0000000000000000000000000000000037e740", //f03663680
        sli: {
          lastUpdate: BigInt(Math.floor(Date.now() / 1000)),
          availability: 2,
          latency: 2,
          indexing: 2,
          retention: 2,
          bandwidth: 2,
          stability: 2,
        },
      },
    ];

    // await setSliOnOracleContract(sliDataForProviders);
  } catch (err) {
    logger.error({ err }, "Oracle job failed");
  }

  logger.info("Oracle job finished");
}
