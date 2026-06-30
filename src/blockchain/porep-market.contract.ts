import { Address } from "viem";
import { ContractName } from "../../prisma/generated/client";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import {
  OnChainTransactionResult,
  PorepMarketContractDealProposal,
} from "../utils/types";
import { POREP_MARKET_CONTRACT_ABI } from "./abis/porep-market-abi";
import {
  getRpcClient,
  getWalletClient,
  waitForTransactionReceiptWithRetry,
  WalletAccountRole,
} from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[PoRep Market Contract] " },
);

export async function getDealsFromPoRepMarketContract(): Promise<
  PorepMarketContractDealProposal[]
> {
  childLogger.info("Fetching completed deals...");

  const rpcClient = getRpcClient();

  const existingDeals = await rpcClient.readContract({
    address: SERVICE_CONFIG.POREP_MARKET_CONTRACT_ADDRESS as Address,
    abi: POREP_MARKET_CONTRACT_ABI,
    functionName: "getDeals",
  });

  // TODO: getDealSLIs for SLI
  // TODO: getDealData for manifest and deal data

  childLogger.info(`Fetched ${existingDeals.length} deals from contract`);

  return existingDeals as PorepMarketContractDealProposal[];
}

export async function rejectExpiredDealOnPoRepMarketContract(
  onChainDealId: bigint,
): Promise<OnChainTransactionResult> {
  childLogger.info(`Checking if deal with ID ${onChainDealId} is expired...`);

  const functionName = "rejectExpiredDeal";

  const porepMarketContractAddress =
    SERVICE_CONFIG.POREP_MARKET_CONTRACT_ADDRESS as Address;

  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(WalletAccountRole.ORACLE_ROLE);

  childLogger.info(`${functionName}: Simulating request...`);

  const { request } = await rpcClient.simulateContract({
    address: porepMarketContractAddress,
    abi: POREP_MARKET_CONTRACT_ABI,
    functionName,
    args: [onChainDealId],
    account: walletClient.account,
  });

  childLogger.info(`${functionName}: Sending transaction...`);

  const txHash = await walletClient.writeContract(request);

  childLogger.info(
    `${functionName}: Transaction sent: ${txHash}, waiting for confirmation...`,
  );

  const receipt = await waitForTransactionReceiptWithRetry(txHash);

  childLogger.info(
    `${functionName}: Transaction executed in block ${receipt?.blockNumber}`,
  );

  return {
    success: true,
    contractName: ContractName.PoRepMarket,
    functionName,
    receipt,
  };
}

export async function activatePaymentOnPoRepMarketContract(
  onChainDealId: bigint,
): Promise<OnChainTransactionResult> {
  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(WalletAccountRole.POREP_SERVICE_ROLE);
  const functionName = "activatePayment";

  childLogger.info(`${functionName}: Simulating request...`);

  const { request } = await rpcClient.simulateContract({
    address: SERVICE_CONFIG.POREP_MARKET_CONTRACT_ADDRESS as Address,
    abi: POREP_MARKET_CONTRACT_ABI,
    functionName,
    args: [onChainDealId],
    account: walletClient.account,
  });

  childLogger.info(`${functionName}: Sending transaction...`);

  const txHash = await walletClient.writeContract(request);

  childLogger.info(
    `activatePayment: Transaction sent: ${txHash}, waiting for confirmation...`,
  );

  const receipt = await waitForTransactionReceiptWithRetry(txHash);

  childLogger.info(
    `${functionName}: Transaction executed in block ${receipt?.blockNumber}`,
  );

  return {
    success: true,
    contractName: ContractName.Validator,
    functionName,
    receipt,
  };
}
