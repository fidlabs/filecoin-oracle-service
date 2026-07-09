import { encodeAbiParameters } from "viem";

export const NO_ADDITIONAL_EVIDENCE_DATA = "0x";

const EVIDENCE_BATCH_SIZE = 1000n;

export function getEvidenceBatchSizes(
  allocationsRequiredCount: bigint | null,
): bigint[] {
  if (!allocationsRequiredCount) return [];

  const batchSizes: bigint[] = [];
  let remainingAllocations = allocationsRequiredCount;

  while (remainingAllocations > 0n) {
    const batchSize =
      remainingAllocations > EVIDENCE_BATCH_SIZE
        ? EVIDENCE_BATCH_SIZE
        : remainingAllocations;

    batchSizes.push(batchSize);
    remainingAllocations -= batchSize;
  }

  return batchSizes;
}

export function encodeEvidenceBatchData(batchSize: bigint): `0x${string}` {
  return encodeAbiParameters([{ type: "uint256" }], [batchSize]);
}
