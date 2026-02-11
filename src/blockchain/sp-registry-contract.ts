import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env.js";
import { baseLogger } from "../utils/logger.js";
import { SP_REGISTRY_CONTRACT_ABI } from "./abis/sp-registry-abi.js";
import { getRpcClient } from "./blockchain-client.js";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SP Registry Contract] " },
);

export async function getProvidersFromSPRegistryContract(): Promise<number[]> {
  const rpcClient = getRpcClient();

  childLogger.info("Fetching storage providers...");

  const storageProviders = await rpcClient.readContract({
    address: SERVICE_CONFIG.SP_REGISTRY_CONTRACT_ADDRESS as Address,
    abi: SP_REGISTRY_CONTRACT_ABI,
    functionName: "getCommittedProviders",
  });

  childLogger.info(
    `Fetched ${storageProviders.length} storage providers, extracting unique ones...`,
  );

  return storageProviders.map(Number);
}
