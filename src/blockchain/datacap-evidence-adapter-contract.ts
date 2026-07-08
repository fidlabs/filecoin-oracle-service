import { Address } from "viem";
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
  { msgPrefix: "[Datacap Evidence Contract] " },
);

const IDS_PAGE_SIZE = 500n;

type PaginatedIdsFunctionName = "getAllocationIdsPerDeal" | "getClaimIds";

async function getPaginatedIdsPerDeal({
  onChainDealId,
  datacapEvidenceContractAddress,
  functionName,
  itemLabel,
}: {
  onChainDealId: bigint;
  datacapEvidenceContractAddress: Address;
  functionName: PaginatedIdsFunctionName;
  itemLabel: string;
}): Promise<bigint[]> {
  childLogger.info(`Fetching ${itemLabel} for deal ${onChainDealId}...`);

  const rpcClient = getRpcClient();
  const ids: bigint[] = [];
  let offset = 0n;
  let totalItems: bigint | undefined;

  do {
    const [pageIds, total] = await rpcClient.readContract({
      address: datacapEvidenceContractAddress,
      abi: DATACAP_EVIDENCE_ADAPTER_CONTRACT_ABI,
      functionName,
      args: [onChainDealId, offset, IDS_PAGE_SIZE],
    });

    totalItems = total;
    ids.push(...pageIds);
    offset += BigInt(pageIds.length);

    childLogger.info(
      `Fetched ${ids.length}/${totalItems} ${itemLabel} for deal ${onChainDealId}`,
    );

    if (pageIds.length === 0) {
      break;
    }
  } while (offset < totalItems);

  childLogger.info(
    `Fetched ${ids.length} ${itemLabel} for deal ${onChainDealId}`,
  );

  return ids;
}

export async function getClientAllocationIdsPerDealFromDCEvidenceContract(
  onChainDealId: bigint,
  datacapEvidenceContractAddress: Address,
): Promise<bigint[]> {
  return getPaginatedIdsPerDeal({
    onChainDealId,
    datacapEvidenceContractAddress,
    functionName: "getAllocationIdsPerDeal",
    itemLabel: "allocation IDs",
  });
}

// not used for now - we can use this to fetch claim IDs for a deal if needed in the future
export async function getClaimIdsPerDeal(
  onChainDealId: bigint,
  datacapEvidenceContractAddress: Address,
): Promise<bigint[]> {
  return getPaginatedIdsPerDeal({
    onChainDealId,
    datacapEvidenceContractAddress,
    functionName: "getClaimIds",
    itemLabel: "claim IDs",
  });
}

export async function isDataCapPostingFinishedOnDCEvidenceContract(
  onChainDealId: bigint,
  datacapEvidenceContractAddress: Address,
): Promise<boolean> {
  childLogger.info(
    `Checking if DataCap posting is finished for deal ${onChainDealId}...`,
  );

  const rpcClient = getRpcClient();

  const isFinished = await rpcClient.readContract({
    address: datacapEvidenceContractAddress,
    abi: DATACAP_EVIDENCE_ADAPTER_CONTRACT_ABI,
    functionName: "isDataCapPostingFinished",
    args: [onChainDealId],
  });

  childLogger.info(
    `DataCap posting finished for deal ${onChainDealId}: ${isFinished}`,
  );

  return isFinished;
}

export async function setClaimTerminatedEarlyOnDCEvidenceContract(
  allocationIds: bigint[],
  datacapEvidenceContractAddress: Address,
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
    address: datacapEvidenceContractAddress,
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
