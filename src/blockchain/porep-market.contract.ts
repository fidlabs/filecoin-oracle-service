import { Address } from "viem";
import { ContractName } from "../../prisma/generated/client";
import { SERVICE_CONFIG } from "../config/env";
import { toPrismaEvidenceResult } from "../services/db/deal-status.db";
import { baseLogger } from "../utils/logger";
import {
  DealEvidenceStatus,
  EvidenceActivationDecision,
  OnChainTransactionResult,
  PorepMarketContractDealSli,
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

type EvidenceTransactionFunctionName =
  | "submitEvidenceBatch"
  | "activateEvidence";

export interface PorepMarketEvidenceTransactionResult {
  decision: EvidenceActivationDecision;
  transactionResult: OnChainTransactionResult;
}

export interface PorepMarketEvidenceStatusTransactionResult {
  status: DealEvidenceStatus;
  transactionResult: OnChainTransactionResult;
}

export async function getDealSLIsFromPoRepMarketContract(
  onChainDealId: bigint,
): Promise<PorepMarketContractDealSli> {
  childLogger.info(`Fetching SLI thresholds for deal ${onChainDealId}...`);

  const rpcClient = getRpcClient();

  const dealSlis = await rpcClient.readContract({
    address: SERVICE_CONFIG.POREP_MARKET_CONTRACT_ADDRESS as Address,
    abi: POREP_MARKET_CONTRACT_ABI,
    functionName: "getDealSLIs",
    args: [onChainDealId],
  });

  childLogger.info(
    `Fetched SLI thresholds for deal ${onChainDealId} from contract`,
  );

  return {
    onChainDealId,
    ...dealSlis,
  } as PorepMarketContractDealSli;
}

async function executeEvidenceTransactionOnPoRepMarketContract({
  functionName,
  onChainDealId,
  evidenceData,
}: {
  functionName: EvidenceTransactionFunctionName;
  onChainDealId: bigint;
  evidenceData: `0x${string}`;
}): Promise<PorepMarketEvidenceTransactionResult> {
  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(WalletAccountRole.POREP_SERVICE_ROLE);

  childLogger.info(
    `${functionName}: Simulating request for deal ${onChainDealId}...`,
  );

  const { request, result: decision } = await rpcClient.simulateContract({
    address: SERVICE_CONFIG.POREP_MARKET_CONTRACT_ADDRESS as Address,
    abi: POREP_MARKET_CONTRACT_ABI,
    functionName,
    args: [onChainDealId, evidenceData],
    account: walletClient.account,
  });

  childLogger.info(
    { decision },
    `${functionName}: Simulation result for deal ${onChainDealId}`,
  );

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
    decision: decision as EvidenceActivationDecision,
    transactionResult: {
      success: true,
      contractName: ContractName.PoRepMarket,
      functionName,
      receipt,
    },
  };
}

export async function submitEvidenceBatchOnPoRepMarketContract(
  onChainDealId: bigint,
  evidenceData: `0x${string}`,
): Promise<PorepMarketEvidenceTransactionResult> {
  return executeEvidenceTransactionOnPoRepMarketContract({
    functionName: "submitEvidenceBatch",
    onChainDealId,
    evidenceData,
  });
}

export async function activateEvidenceOnPoRepMarketContract(
  onChainDealId: bigint,
  evidenceData: `0x${string}`,
): Promise<PorepMarketEvidenceTransactionResult> {
  return executeEvidenceTransactionOnPoRepMarketContract({
    functionName: "activateEvidence",
    onChainDealId,
    evidenceData,
  });
}

export async function refreshEvidenceStatusOnPoRepMarketContract(
  onChainDealId: bigint,
  evidenceData: `0x${string}`,
): Promise<PorepMarketEvidenceStatusTransactionResult> {
  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(WalletAccountRole.POREP_SERVICE_ROLE);
  const functionName = "refreshEvidenceStatus";

  childLogger.info(
    `${functionName}: Simulating request for deal ${onChainDealId}...`,
  );

  const { request, result } = await rpcClient.simulateContract({
    address: SERVICE_CONFIG.POREP_MARKET_CONTRACT_ADDRESS as Address,
    abi: POREP_MARKET_CONTRACT_ABI,
    functionName,
    args: [onChainDealId, evidenceData],
    account: walletClient.account,
  });

  const status = {
    activeCoveredBytes: result.activeCoveredBytes,
    lastEvidenceRefreshEpoch: result.lastEvidenceRefreshEpoch,
    checkedClaims: result.checkedClaims,
    totalClaims: result.totalClaims,
    reasonCode: BigInt(result.reasonCode),
    result: toPrismaEvidenceResult(result.result),
  };

  childLogger.info(
    { status },
    `${functionName}: Simulation result for deal ${onChainDealId}`,
  );

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
    status,
    transactionResult: {
      success: true,
      contractName: ContractName.PoRepMarket,
      functionName,
      receipt,
    },
  };
}

export async function finalizeDealOnPoRepMarketContract(
  onChainDealId: bigint,
): Promise<OnChainTransactionResult> {
  const functionName = "finalizeDeal";
  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(WalletAccountRole.POREP_SERVICE_ROLE);

  childLogger.info(
    `${functionName}: Simulating request for deal ${onChainDealId}...`,
  );

  const { request } = await rpcClient.simulateContract({
    address: SERVICE_CONFIG.POREP_MARKET_CONTRACT_ADDRESS as Address,
    abi: POREP_MARKET_CONTRACT_ABI,
    functionName,
    args: [onChainDealId],
    account: walletClient.account,
  });

  childLogger.info(
    `${functionName}: Sending transaction for deal ${onChainDealId}...`,
  );

  const txHash = await walletClient.writeContract(request);

  childLogger.info(
    `${functionName}: Transaction sent: ${txHash}, waiting for confirmation...`,
  );

  const receipt = await waitForTransactionReceiptWithRetry(txHash);

  childLogger.info(
    `${functionName}: Transaction executed in block ${receipt.blockNumber}`,
  );

  return {
    success: true,
    contractName: ContractName.PoRepMarket,
    functionName,
    receipt,
  };
}
