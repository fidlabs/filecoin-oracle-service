import { Address, decodeFunctionResult, encodeFunctionData } from "viem";
import { ContractName } from "../../prisma/generated/client";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { OnChainTransactionResult, SliAttestation } from "../utils/types";
import { SLI_ORACLE_CONTRACT_ABI } from "./abis/sli-oracle-abi";
import {
  getRpcClient,
  getWalletClient,
  waitForTransactionReceiptWithRetry,
} from "./blockchain-client";
import { WalletAccountRole } from "./client-contract";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SLI Oracle Contract] " },
);

export async function setSliOnOracleContract(
  sliData: SliAttestation[],
): Promise<OnChainTransactionResult> {
  childLogger.info(`Setting SLI for providers on oracle contract...`);

  const oracleContractAddress =
    SERVICE_CONFIG.SLI_ORACLE_CONTRACT_ADDRESS as Address;

  const functionName = "setSLI";

  const encodedCalls = sliData.map((req) =>
    encodeFunctionData({
      abi: SLI_ORACLE_CONTRACT_ABI,
      functionName,
      args: [req.provider, req.slis],
    }),
  );

  childLogger.info(`${functionName}: Simulating request...`);

  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(WalletAccountRole.ORACLE_ROLE);

  const { request } = await rpcClient.simulateContract({
    address: oracleContractAddress,
    abi: SLI_ORACLE_CONTRACT_ABI,
    functionName: "multicall",
    args: [encodedCalls],
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
    contractName: ContractName.SliOracle,
    functionName,
    receipt,
  };
}

export async function getLastSliForProviderFromSliOracleContract(
  providerIds: bigint[],
) {
  const oracleContractAddress =
    SERVICE_CONFIG.SLI_ORACLE_CONTRACT_ADDRESS as Address;

  childLogger.info("getAttestation: Simulating request...");

  const rpcClient = getRpcClient();

  const encodedCalls = providerIds.map((providerId) =>
    encodeFunctionData({
      abi: SLI_ORACLE_CONTRACT_ABI,
      functionName: "getAttestation",
      args: [providerId],
    }),
  );

  const { result } = await rpcClient.simulateContract({
    address: oracleContractAddress,
    abi: SLI_ORACLE_CONTRACT_ABI,
    functionName: "multicall",
    args: [encodedCalls],
  });

  childLogger.info(
    `getAttestation: Fetched attestation for providers from oracle contract`,
  );

  const decoded = result.map((res) =>
    decodeFunctionResult({
      abi: SLI_ORACLE_CONTRACT_ABI,
      functionName: "getAttestation",
      data: res,
    }),
  );

  const providerAttestations = decoded.map((res, index) => ({
    providerId: providerIds[index],
    sliAttestation: res.slis,
  }));

  return providerAttestations;
}
