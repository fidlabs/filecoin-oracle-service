import { Address, encodeFunctionData } from "viem";
import { SERVICE_CONFIG } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { CdpSliResponse } from "../utils/types.js";
import { SLI_ORACLE_ABI } from "./abis/sli-oracle-abi.js";
import { getRpcClient, getWalletClient } from "./blockchain-client.js";

export async function setSliOnOracleContract(
  sliDataForProviders: CdpSliResponse[],
) {
  const rpcClient = getRpcClient();
  const walletClient = getWalletClient();

  const oracleContractAddress =
    SERVICE_CONFIG.ORACLE_CONTRACT_ADDRESS as Address;

  const encodedCalls = sliDataForProviders.map((req) =>
    encodeFunctionData({
      abi: SLI_ORACLE_ABI,
      functionName: "setSLI",
      args: [req.provider as Address, req.sli],
    }),
  );

  logger.info("Simulating request to oracle contract...");

  const { request } = await rpcClient.simulateContract({
    address: oracleContractAddress,
    abi: SLI_ORACLE_ABI,
    functionName: "multicall",
    args: [encodedCalls],
    account: walletClient.account,
  });

  logger.info("Sending transaction to oracle contract...");

  const txHash = await walletClient.writeContract(request);

  logger.info(`Transaction sent: ${txHash}, waiting for confirmation...`);

  const receipt = await rpcClient.waitForTransactionReceipt({
    hash: txHash,
  });

  logger.info(`Transaction executed in block ${receipt.blockNumber}`);
}
