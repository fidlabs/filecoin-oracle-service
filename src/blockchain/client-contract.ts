import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env";

import { baseLogger } from "../utils/logger";
import { CLIENT_CONTRACT_ABI } from "./abis/client-abi";
import { getRpcClient, getWalletClient } from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Client Contract] " },
);

export enum WalletAccountRole {
  POREP_SERVICE_ROLE = "POREP_SERVICE_ROLE",
  ORACLE_ROLE = "ORACLE_ROLE",
  TERMINATION_ORACLE_ROLE = "TERMINATION_ORACLE_ROLE",
  FILECOIN_PAY_ROLE = "FILECOIN_PAY_ROLE",
}

const rpcClient = getRpcClient();
const walletClient = getWalletClient(WalletAccountRole.TERMINATION_ORACLE_ROLE);

export async function getClientsForSPFromClientContract(
  storageProviderId: number,
): Promise<Address[]> {
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
  onChainDealId: bigint,
): Promise<bigint[]> {
  childLogger.info(`Fetching allocation IDs for deal ${onChainDealId}...`);

  const allocationIds = await rpcClient.readContract({
    address: SERVICE_CONFIG.CLIENT_CONTRACT_ADDRESS as Address,
    abi: CLIENT_CONTRACT_ABI,
    functionName: "getClientAllocationIdsPerDeal",
    args: [onChainDealId],
  });

  childLogger.info(
    `Fetched ${allocationIds.length} allocation IDs for deal ${onChainDealId}`,
  );

  return allocationIds as bigint[];
}

export async function setClaimTerminatedEarlyOnClientContract(
  allocationIds: bigint[],
) {
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
