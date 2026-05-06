import { Address } from "viem";
import { baseLogger } from "../utils/logger";
import { VALIDATOR_CONTRACT_ABI } from "./abis/validator-abi";
import { getRpcClient, getWalletClient } from "./blockchain-client";
import { WalletAccountRole } from "./client-contract";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Validator Contract] " },
);

export async function terminateRailOnValidatorContract(
  railId: bigint,
  validatorContractAddress: Address,
): Promise<boolean> {
  childLogger.info("terminateRail: Simulating request...");

  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(WalletAccountRole.POREP_SERVICE_ROLE);

  const { request } = await rpcClient.simulateContract({
    address: validatorContractAddress,
    abi: VALIDATOR_CONTRACT_ABI,
    functionName: "terminateRail",
    args: [railId],
    account: walletClient.account,
  });

  childLogger.info("terminateRail: Sending transaction...");

  const txHash = await walletClient.writeContract(request);

  childLogger.info(
    `terminateRail: Transaction sent: ${txHash}, waiting for confirmation...`,
  );

  const receipt = await rpcClient.waitForTransactionReceipt({
    hash: txHash,
  });

  childLogger.info(
    `terminateRail: Transaction executed in block ${receipt.blockNumber}`,
  );

  return true;
}

export async function setDealEndEpochOnValidatorContract(
  dealId: bigint,
  dealEndEpoch: bigint,
  validatorContractAddress: Address,
): Promise<boolean> {
  childLogger.info("setDealEndEpoch: Simulating request...");

  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(WalletAccountRole.POREP_SERVICE_ROLE);

  const { request } = await rpcClient.simulateContract({
    address: validatorContractAddress,
    abi: VALIDATOR_CONTRACT_ABI,
    functionName: "setDealEndEpoch",
    args: [dealId, dealEndEpoch],
    account: walletClient.account,
  });

  childLogger.info("setDealEndEpoch: Sending transaction...");

  const txHash = await walletClient.writeContract(request);

  childLogger.info(
    `setDealEndEpoch: Transaction sent: ${txHash}, waiting for confirmation...`,
  );

  const receipt = await rpcClient.waitForTransactionReceipt({
    hash: txHash,
  });

  childLogger.info(
    `setDealEndEpoch: Transaction executed in block ${receipt.blockNumber}`,
  );

  return true;
}

export async function modifyRailPaymentOnValidatorContract(
  railId: bigint,
  validatorContractAddress: Address,
): Promise<boolean> {
  childLogger.info("modifyRailPayment: Simulating request...");

  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(WalletAccountRole.POREP_SERVICE_ROLE);

  const { request } = await rpcClient.simulateContract({
    address: validatorContractAddress,
    abi: VALIDATOR_CONTRACT_ABI,
    functionName: "modifyRailPayment",
    args: [railId],
    account: walletClient.account,
  });

  childLogger.info("modifyRailPayment: Sending transaction...");

  const txHash = await walletClient.writeContract(request);

  childLogger.info(
    `modifyRailPayment: Transaction sent: ${txHash}, waiting for confirmation...`,
  );

  const receipt = await rpcClient.waitForTransactionReceipt({
    hash: txHash,
  });

  childLogger.info(
    `modifyRailPayment: Transaction executed in block ${receipt.blockNumber}`,
  );

  return true;
}
