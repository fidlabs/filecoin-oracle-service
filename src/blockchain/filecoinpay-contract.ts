import { Address, BaseError, ContractFunctionRevertedError } from "viem";
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
import { WalletAccountRole } from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[FilecoinPay Contract] " },
);

export async function settleRailOnFilecoinPayContract(
  railId: bigint,
  untilEpoch?: bigint,
): Promise<OnChainTransactionResult> {
  childLogger.info(`Settling rail id ${railId}...`);

  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(WalletAccountRole.FILECOIN_PAY_ROLE);

  const functionName = "settleRail";
  childLogger.info(`${functionName}: Simulating request...`);

  const settlementEpoch = untilEpoch ?? (await rpcClient.getBlockNumber());
  const filecoinPayContractAddress =
    SERVICE_CONFIG.FILECOIN_PAY_CONTRACT_ADDRESS as Address;

  const { request } = await rpcClient.simulateContract({
    address: filecoinPayContractAddress,
    abi: FILECOIN_PAY_CONTRACT_ABI,
    functionName: functionName,
    args: [railId, settlementEpoch],
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
    contractName: ContractName.FilecoinPay,
    functionName,
    receipt,
  };
}

/** A finalized rail is removed by Filecoin Pay and getRail reverts for it. */
export async function getRailOnFilecoinPayContract(railId: bigint) {
  try {
    return await getRpcClient().readContract({
      address: SERVICE_CONFIG.FILECOIN_PAY_CONTRACT_ADDRESS as Address,
      abi: FILECOIN_PAY_CONTRACT_ABI,
      functionName: "getRail",
      args: [railId],
    });
  } catch (error) {
    if (error instanceof BaseError) {
      const revert = error.walk(
        (cause) => cause instanceof ContractFunctionRevertedError,
      );
      if (
        revert instanceof ContractFunctionRevertedError &&
        revert.data?.errorName === "RailInactiveOrSettled"
      ) {
        return null;
      }
    }
    throw error;
  }
}
