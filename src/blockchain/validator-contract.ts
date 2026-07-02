import { Address } from "viem";
import { ContractName } from "../../prisma/generated/client";
import { baseLogger } from "../utils/logger";
import { OnChainTransactionResult } from "../utils/types";
import { VALIDATOR_CONTRACT_ABI } from "./abis/validator-abi";
import {
  getRpcClient,
  getWalletClient,
  waitForTransactionReceiptWithRetry,
  WalletAccountRole,
} from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Validator Contract] " },
);

export async function terminateRailOnValidatorContract(
  validatorContractAddress: Address,
): Promise<OnChainTransactionResult> {
  childLogger.info("Terminating rail on validator contract...");

  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(WalletAccountRole.POREP_SERVICE_ROLE);
  const functionName = "terminateRail";

  childLogger.info(`${functionName}: Simulating request...`);

  const { request } = await rpcClient.simulateContract({
    address: validatorContractAddress,
    abi: VALIDATOR_CONTRACT_ABI,
    functionName,
    args: [],
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
    contractName: ContractName.Validator,
    functionName,
    receipt,
  };
}
