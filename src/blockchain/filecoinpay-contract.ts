import { Address } from "viem";
import { ContractName } from "../../prisma/generated/client";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { OnChainTransactionResult } from "../utils/types";
import { FILECOIN_PAY_CONTRACT_ABI } from "./abis/filecoinpay-abi";
import {
  getRpcClient,
  getWalletClient,
  waitForTransactionReceiptWithRetry,
} from "./blockchain-client";
import { WalletAccountRole } from "./client-contract";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[FilecoinPay Contract] " },
);

export async function settleRailOnFilecoinPayContract(
  railId: bigint,
): Promise<OnChainTransactionResult> {
  childLogger.info(`Settling rail id ${railId}...`);

  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(WalletAccountRole.FILECOIN_PAY_ROLE);

  const functionName = "settleRail";
  childLogger.info(`${functionName}: Simulating request...`);

  const currentBlock = await rpcClient.getBlockNumber();
  const filecoinPayContractAddress =
    SERVICE_CONFIG.FILECOIN_PAY_CONTRACT_ADDRESS as Address;

  const { request } = await rpcClient.simulateContract({
    address: filecoinPayContractAddress,
    abi: FILECOIN_PAY_CONTRACT_ABI,
    functionName: functionName,
    args: [railId, currentBlock],
    account: walletClient.account,
  });

  childLogger.info(`${functionName}: Sending transaction...`);

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
    contractName: ContractName.FilecoinPay,
    functionName,
    receipt,
  };
}
