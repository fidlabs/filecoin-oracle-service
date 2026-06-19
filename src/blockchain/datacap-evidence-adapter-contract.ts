import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env";

import { ContractName } from "../../prisma/generated/client";
import { baseLogger } from "../utils/logger";
import { OnChainTransactionResult } from "../utils/types";
import { DATACAP_EVIDENCE_ADAPTER_CONTRACT_ABI } from "./abis/datacap-evidence-adapter-abi";
import {
  getRpcClient,
  getWalletClient,
  waitForTransactionReceiptWithRetry,
  WalletAccountRole,
} from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Client Contract] " },
);

const ALLOCATION_IDS_PAGE_SIZE = 500n;

export async function getClientAllocationIdsPerDeal(
  onChainDealId: bigint,
): Promise<bigint[]> {
  childLogger.info(`Fetching allocation IDs for deal ${onChainDealId}...`);

  const rpcClient = getRpcClient();
  const allocationIds: bigint[] = [];
  let offset = 0n;
  let sumOfAllocations: bigint | undefined;

  do {
    const [ids, total] = await rpcClient.readContract({
      address:
        SERVICE_CONFIG.DATACAP_EVIDENCE_ADAPTER_CONTRACT_ADDRESS as Address,
      abi: DATACAP_EVIDENCE_ADAPTER_CONTRACT_ABI,
      functionName: "getAllocationIdsPerDeal",
      args: [onChainDealId, offset, ALLOCATION_IDS_PAGE_SIZE],
    });

    sumOfAllocations = total;
    allocationIds.push(...ids);
    offset += BigInt(ids.length);

    childLogger.info(
      `Fetched ${allocationIds.length}/${sumOfAllocations} allocation IDs for deal ${onChainDealId}`,
    );

    if (ids.length === 0) {
      break;
    }
  } while (offset < sumOfAllocations);

  childLogger.info(
    `Fetched ${allocationIds.length} allocation IDs for deal ${onChainDealId}`,
  );

  return allocationIds as bigint[];
}

export async function setClaimTerminatedEarlyOnClientContract(
  allocationIds: bigint[],
): Promise<OnChainTransactionResult> {
  childLogger.info(
    `Setting claimTerminatedEarly for allocation IDs ${allocationIds.join(
      ", ",
    )} on client contract...`,
  );

  const rpcClient = getRpcClient();
  const walletClient = getWalletClient(
    WalletAccountRole.TERMINATION_ORACLE_ROLE,
  );
  const functionName = "claimsTerminatedEarly";

  childLogger.info(`${functionName}: Simulating request...`);

  const { request } = await rpcClient.simulateContract({
    address:
      SERVICE_CONFIG.DATACAP_EVIDENCE_ADAPTER_CONTRACT_ADDRESS as Address,
    abi: DATACAP_EVIDENCE_ADAPTER_CONTRACT_ABI,
    functionName,
    args: [allocationIds],
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
    contractName: ContractName.Client,
    functionName,
    receipt,
  };
}
