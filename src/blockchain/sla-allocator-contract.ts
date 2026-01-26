import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env.js";
import { baseLogger } from "../utils/logger.js";
import { SLA_ALLOCATOR_CONTRACT_ABI } from "./abis/sla-allocator-abi.js";
import { getRpcClient } from "./blockchain-client.js";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SLA Allocator Contract] " },
);

export async function getProvidersFromSlaAllocatorContract(): Promise<
  number[]
> {
  const rpcClient = getRpcClient();

  childLogger.info("Fetching providers from contract...");

  const providers = await rpcClient.readContract({
    address: SERVICE_CONFIG.SLA_ALLOCATOR_CONTRACT_ADDRESS as Address,
    abi: SLA_ALLOCATOR_CONTRACT_ABI,
    functionName: "getProviders",
  });

  childLogger.info(`Fetched ${providers.length} providers from contract`);

  return providers.map((p) => Number(p));
}
