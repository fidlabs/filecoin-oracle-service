import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { SP_REGISTRY_CONTRACT_ABI } from "./abis/sp-registry-abi";
import { getRpcClient } from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SP Registry Contract] " },
);

export async function getProvidersFromSPRegistryContract(): Promise<number[]> {
  childLogger.info("Fetching storage providers...");

  const rpcClient = getRpcClient();

  const storageProviders = await rpcClient.readContract({
    address: SERVICE_CONFIG.SP_REGISTRY_CONTRACT_ADDRESS as Address,
    abi: SP_REGISTRY_CONTRACT_ABI,
    functionName: "getProviders",
  });

  childLogger.info(
    `Fetched ${storageProviders.length} storage providers, extracting unique ones...`,
  );

  return storageProviders.map(Number);
}
