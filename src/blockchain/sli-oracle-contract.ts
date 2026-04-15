import { Address, encodeFunctionData } from "viem";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { SliAttestation } from "../utils/types";
import { SLI_ORACLE_CONTRACT_ABI } from "./abis/sli-oracle-abi";
import { getRpcClient, getWalletClient } from "./blockchain-client";
import { WalletAccountRole } from "./client-contract";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SLI Oracle Contract] " },
);

const rpcClient = getRpcClient();
const walletClient = getWalletClient(WalletAccountRole.ORACLE_ROLE);

export async function setSliOnOracleContract(sliData: SliAttestation[]) {
  const oracleContractAddress =
    SERVICE_CONFIG.SLI_ORACLE_CONTRACT_ADDRESS as Address;

  const encodedCalls = sliData.map((req) =>
    encodeFunctionData({
      abi: SLI_ORACLE_CONTRACT_ABI,
      functionName: "setSLI",
      args: [req.provider, req.slis],
    }),
  );

  childLogger.info("setSLI: Simulating request...");

  const { request } = await rpcClient.simulateContract({
    address: oracleContractAddress,
    abi: SLI_ORACLE_CONTRACT_ABI,
    functionName: "multicall",
    args: [encodedCalls],
    account: walletClient.account,
  });

  childLogger.info("setSLI: Sending transaction...");

  const txHash = await walletClient.writeContract(request);

  childLogger.info(
    `setSLI: Transaction sent: ${txHash}, waiting for confirmation...`,
  );

  const receipt = await rpcClient.waitForTransactionReceipt({
    hash: txHash,
  });

  childLogger.info(
    `setSLI: Transaction executed in block ${receipt.blockNumber}`,
  );
}
