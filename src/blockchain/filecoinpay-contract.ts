import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { FILECOIN_PAY_CONTRACT_ABI } from "./abis/filecoinpay-abi";
import { getRpcClient, getWalletClient } from "./blockchain-client";
import { WalletAccountRole } from "./client-contract";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[FilecoinPay Contract] " },
);

export async function settleRailOnFilecoinPayContract(
  railId: bigint,
): Promise<void> {
  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(WalletAccountRole.FILECOIN_PAY_ROLE);
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
