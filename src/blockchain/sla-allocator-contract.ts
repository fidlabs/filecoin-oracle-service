import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { SLA_ALLOCATOR_ABI } from "./abis/sla-allocator-abi.js";
import { getRpcClient } from "./blockchain-client.js";

export async function getProvidersFromSlaAllocatorContract(): Promise<
  number[]
> {
  const rpcClient = getRpcClient();

  logger.info("Fetching providers from SLA Allocator contract...");

  const providers = await rpcClient.readContract({
    address: SERVICE_CONFIG.SLA_ALLOCATOR_CONTRACT_ADDRESS as Address,
    abi: SLA_ALLOCATOR_ABI,
    functionName: "providers",
  });

  logger.info(
    `Fetched ${providers.length} providers from SLA Allocator contract`,
  );

  return providers.map((p) => Number(p));
}
