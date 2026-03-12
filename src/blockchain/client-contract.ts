import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env.js";

import { baseLogger } from "../utils/logger.js";
import { getRpcClient, getWalletClient } from "./blockchain-client.js";
import { CLIENT_CONTRACT_ABI } from "./abis/client-abi.js";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Client Contract] " },
);

export async function getClientsForSPFromClientContract(
  storageProviderId: number,
): Promise<Address[]> {
  const rpcClient = getRpcClient();

  childLogger.info("Fetching clients for storage provider...");

  const spClients = await rpcClient.readContract({
    address: SERVICE_CONFIG.CLIENT_CONTRACT_ADDRESS as Address,
    abi: CLIENT_CONTRACT_ABI,
    functionName: "getSPClients",
    args: [BigInt(storageProviderId)],
  });

  childLogger.info(
    `Fetched ${spClients.length} clients for SP ${storageProviderId}`,
  );

  return spClients as Address[];
}

export async function getClientAllocationIdsPerDeal(
  dealId: bigint,
): Promise<number[]> {
  const rpcClient = getRpcClient();

  childLogger.info(`Fetching allocation IDs for deal ${dealId}...`);

  const allocationIds = await rpcClient.readContract({
    address: SERVICE_CONFIG.CLIENT_CONTRACT_ADDRESS as Address,
    abi: CLIENT_CONTRACT_ABI,
    functionName: "getClientAllocationIdsPerDeal",
    args: [dealId],
  });

  childLogger.info(
    `Fetched ${allocationIds.length} allocation IDs for deal ${dealId}`,
  );

  return allocationIds.map(Number);
}

export async function setClaimTerminatedEarly(allocationIds: bigint[]) {
  const rpcClient = getRpcClient();
  const walletClient = getWalletClient();

  childLogger.info("claimsTerminatedEarly: Simulating request...");

  const { request } = await rpcClient.simulateContract({
    address: SERVICE_CONFIG.CLIENT_CONTRACT_ADDRESS as Address,
    abi: CLIENT_CONTRACT_ABI,
    functionName: "claimsTerminatedEarly",
    args: [allocationIds],
    account: walletClient.account,
  });

  childLogger.info("claimsTerminatedEarly: Sending transaction...");

  const txHash = await walletClient.writeContract(request);

  childLogger.info(
    `claimsTerminatedEarly: Transaction sent: ${txHash}, waiting for confirmation...`,
  );

  const receipt = await rpcClient.waitForTransactionReceipt({
    hash: txHash,
  });

  childLogger.info(
    `claimsTerminatedEarly: Transaction executed in block ${receipt.blockNumber}`,
  );
}
