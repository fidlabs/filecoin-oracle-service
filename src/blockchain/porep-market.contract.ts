import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { PorepMarketContractDealProposal } from "../utils/types";
import { POREP_MARKET_CONTRACT_ABI } from "./abis/porep-market-abi";
import { getRpcClient, getWalletClient } from "./blockchain-client";
import { WalletAccountRole } from "./client-contract";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[PoRep Market Contract] " },
);

export async function getCompletedDealsFromPoRepMarketContract(): Promise<
  PorepMarketContractDealProposal[]
> {
  childLogger.info("Fetching completed deals...");

  const rpcClient = getRpcClient();

  const completedDeals = await rpcClient.readContract({
    address: SERVICE_CONFIG.POREP_MARKET_CONTRACT_ADDRESS as Address,
    abi: POREP_MARKET_CONTRACT_ABI,
    functionName: "getCompletedDeals",
  });

  childLogger.info(
    `Fetched ${completedDeals.length} completed deals from contract`,
  );

  return completedDeals as PorepMarketContractDealProposal[];
}

export async function getDealsFromPoRepMarketContract(): Promise<
  PorepMarketContractDealProposal[]
> {
  childLogger.info("Fetching completed deals...");

  const rpcClient = getRpcClient();

  const completedDeals = await rpcClient.readContract({
    address: SERVICE_CONFIG.POREP_MARKET_CONTRACT_ADDRESS as Address,
    abi: POREP_MARKET_CONTRACT_ABI,
    functionName: "getDeals",
  });

  childLogger.info(
    `Fetched ${completedDeals.length} completed deals from contract`,
  );

  return completedDeals as PorepMarketContractDealProposal[];
}

export async function rejectExpiredDealOnPoRepMarketContract(
  onChainDealId: bigint,
): Promise<void> {
  childLogger.info(`Checking if deal with ID ${onChainDealId} is expired...`);

  const porepMarketContractAddress =
    SERVICE_CONFIG.POREP_MARKET_CONTRACT_ADDRESS as Address;

  childLogger.info("rejectExpiredDeal: Simulating request...");

  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(WalletAccountRole.ORACLE_ROLE);

  childLogger.info("rejectExpiredDeal: Simulating request...");

  const { request } = await rpcClient.simulateContract({
    address: porepMarketContractAddress,
    abi: POREP_MARKET_CONTRACT_ABI,
    functionName: "rejectExpiredDeal",
    args: [onChainDealId],
    account: walletClient.account,
  });

  childLogger.info("rejectExpiredDeal: Sending transaction...");

  const txHash = await walletClient.writeContract(request);

  childLogger.info(
    `rejectExpiredDeal: Transaction sent: ${txHash}, waiting for confirmation...`,
  );

  const receipt = await rpcClient.waitForTransactionReceipt({
    hash: txHash,
  });

  childLogger.info(
    `rejectExpiredDeal: Transaction executed in block ${receipt.blockNumber}`,
  );
}
