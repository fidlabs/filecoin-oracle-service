import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env.js";
import { baseLogger } from "../utils/logger.js";
import { FILECOIN_PAY_CONTRACT_ABI } from "./abis/filecoinpay-abi.js";
import { getRpcClient, getWalletClient } from "./blockchain-client.js";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[FilecoinPay Contract] " },
);

export async function settleRailOnFilecoinPayContract(
  railId: bigint,
): Promise<void> {
  const rpcClient = getRpcClient();
  const walletClient = getWalletClient();
  const functionName = "settleRail";

  childLogger.info(`${functionName}: Simulating request...`);

  const currentBlock = await rpcClient.getBlockNumber();

  const { request } = await rpcClient.simulateContract({
    address: SERVICE_CONFIG.FILECOIN_PAY_CONTRACT_ADDRESS as Address,
    abi: FILECOIN_PAY_CONTRACT_ABI,
    functionName: "settleRail",
    args: [railId, currentBlock],
    account: walletClient.account,
  });

  childLogger.info(`${functionName}: Sending transaction...`);

  const txHash = await walletClient.writeContract(request);

  childLogger.info(
    `${functionName}: Transaction sent: ${txHash}, waiting for confirmation...`,
  );

  const receipt = await rpcClient.waitForTransactionReceipt({
    hash: txHash,
  });

  childLogger.info(
    `${functionName}: Transaction executed in block ${receipt.blockNumber}`,
  );
}
