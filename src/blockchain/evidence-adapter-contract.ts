import { Address, parseAbi } from "viem";
import { EvidenceAdapterType } from "../../prisma/generated/client";
import { getChainEvidenceAdapterTypeToDomain } from "../services/db/chain-mappers.db";
import { baseLogger } from "../utils/logger";
import { getRpcClient } from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Evidence Adapter Contract] " },
);

const STORAGE_EVIDENCE_ADAPTER_ABI = parseAbi([
  "function getEvidenceType() pure returns (uint8)",
]);

const evidenceAdapterTypeCache = new Map<string, EvidenceAdapterType>();

export async function getEvidenceAdapterTypeFromContract(
  evidenceAdapterContractAddress: Address,
): Promise<EvidenceAdapterType> {
  const cacheKey = evidenceAdapterContractAddress.toLowerCase();
  const cachedType = evidenceAdapterTypeCache.get(cacheKey);

  if (cachedType) {
    return cachedType;
  }

  const rpcClient = getRpcClient();

  const evidenceType = await rpcClient.readContract({
    address: evidenceAdapterContractAddress,
    abi: STORAGE_EVIDENCE_ADAPTER_ABI,
    functionName: "getEvidenceType",
  });

  const evidenceAdapterType = getChainEvidenceAdapterTypeToDomain(evidenceType);

  childLogger.info(
    `Evidence adapter ${evidenceAdapterContractAddress} type: ${evidenceAdapterType}`,
  );

  evidenceAdapterTypeCache.set(cacheKey, evidenceAdapterType);

  return evidenceAdapterType;
}
