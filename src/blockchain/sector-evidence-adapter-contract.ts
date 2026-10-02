import { Address } from "viem";
import { baseLogger } from "../utils/logger";
import {
  PorepMarketDealSector,
  SectorManifestReceipt,
  SectorRefreshState,
} from "../utils/types";
import { SECTOR_EVIDENCE_ADAPTER_CONTRACT_ABI } from "./abis/sector-evidence-adapter-abi";
import { getRpcClient } from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Sector Evidence Contract] " },
);

const SECTORS_READ_CHUNK_SIZE = 50;

export async function getSectorCountFromSectorEvidenceContract(
  onChainDealId: bigint,
  sectorEvidenceContractAddress: Address,
): Promise<bigint> {
  const rpcClient = getRpcClient();

  return rpcClient.readContract({
    address: sectorEvidenceContractAddress,
    abi: SECTOR_EVIDENCE_ADAPTER_CONTRACT_ABI,
    functionName: "getSectorCount",
    args: [onChainDealId],
  });
}

export async function getManifestReceiptFromSectorEvidenceContract(
  onChainDealId: bigint,
  sectorEvidenceContractAddress: Address,
): Promise<SectorManifestReceipt> {
  childLogger.info(`Fetching manifest receipt for deal ${onChainDealId}...`);

  const rpcClient = getRpcClient();

  const [receipt, sectorCount] = await Promise.all([
    rpcClient.readContract({
      address: sectorEvidenceContractAddress,
      abi: SECTOR_EVIDENCE_ADAPTER_CONTRACT_ABI,
      functionName: "getManifestReceipt",
      args: [onChainDealId],
    }),
    getSectorCountFromSectorEvidenceContract(
      onChainDealId,
      sectorEvidenceContractAddress,
    ),
  ]);

  childLogger.info(
    `Fetched manifest receipt for deal ${onChainDealId}: ${receipt.acceptedPieceCount}/${receipt.pieceCount} pieces, ${sectorCount} sectors, activated: ${receipt.activated}`,
  );

  return {
    providerActorId: receipt.providerActorId,
    pieceCount: BigInt(receipt.pieceCount),
    acceptedPieceCount: BigInt(receipt.acceptedPieceCount),
    acceptedBytes: receipt.acceptedBytes,
    minimumCommitmentEpoch: BigInt(receipt.minimumCommitmentEpoch),
    activated: receipt.activated,
    sectorCount,
  };
}

export async function getSectorNumbersFromSectorEvidenceContract(
  onChainDealId: bigint,
  sectorEvidenceContractAddress: Address,
  fromSectorIndex: bigint,
  toSectorIndex: bigint,
): Promise<bigint[]> {
  const rpcClient = getRpcClient();
  const sectorNumbers: bigint[] = [];

  for (
    let chunkStart = fromSectorIndex;
    chunkStart < toSectorIndex;
    chunkStart += BigInt(SECTORS_READ_CHUNK_SIZE)
  ) {
    const chunkEnd =
      chunkStart + BigInt(SECTORS_READ_CHUNK_SIZE) < toSectorIndex
        ? chunkStart + BigInt(SECTORS_READ_CHUNK_SIZE)
        : toSectorIndex;

    const sectorIndexes: bigint[] = [];

    for (let index = chunkStart; index < chunkEnd; index++) {
      sectorIndexes.push(index);
    }

    const chunkSectorNumbers = await Promise.all(
      sectorIndexes.map((sectorIndex) =>
        rpcClient.readContract({
          address: sectorEvidenceContractAddress,
          abi: SECTOR_EVIDENCE_ADAPTER_CONTRACT_ABI,
          functionName: "getSectorNumber",
          args: [onChainDealId, sectorIndex],
        }),
      ),
    );

    sectorNumbers.push(...chunkSectorNumbers);
  }

  return sectorNumbers;
}

export async function getSectorsFromSectorEvidenceContract(
  onChainDealId: bigint,
  sectorEvidenceContractAddress: Address,
  fromSectorIndex: bigint,
  toSectorIndex: bigint,
): Promise<PorepMarketDealSector[]> {
  childLogger.info(
    `Fetching sectors ${fromSectorIndex}..${toSectorIndex} for deal ${onChainDealId}...`,
  );

  const rpcClient = getRpcClient();

  const sectorNumbers = await getSectorNumbersFromSectorEvidenceContract(
    onChainDealId,
    sectorEvidenceContractAddress,
    fromSectorIndex,
    toSectorIndex,
  );

  const sectors: PorepMarketDealSector[] = [];

  for (
    let chunkStart = 0;
    chunkStart < sectorNumbers.length;
    chunkStart += SECTORS_READ_CHUNK_SIZE
  ) {
    const chunk = sectorNumbers.slice(
      chunkStart,
      chunkStart + SECTORS_READ_CHUNK_SIZE,
    );

    const chunkCoveredBytes = await Promise.all(
      chunk.map((sectorNumber) =>
        rpcClient.readContract({
          address: sectorEvidenceContractAddress,
          abi: SECTOR_EVIDENCE_ADAPTER_CONTRACT_ABI,
          functionName: "getSectorCoveredBytes",
          args: [onChainDealId, sectorNumber],
        }),
      ),
    );

    chunk.forEach((sectorNumber, index) => {
      sectors.push({
        sectorIndex: fromSectorIndex + BigInt(chunkStart + index),
        sectorNumber,
        coveredBytes: chunkCoveredBytes[index],
      });
    });
  }

  childLogger.info(
    `Fetched ${sectors.length} sectors for deal ${onChainDealId}`,
  );

  return sectors;
}

export async function getRefreshStateFromSectorEvidenceContract(
  onChainDealId: bigint,
  sectorEvidenceContractAddress: Address,
): Promise<SectorRefreshState> {
  const rpcClient = getRpcClient();

  const state = await rpcClient.readContract({
    address: sectorEvidenceContractAddress,
    abi: SECTOR_EVIDENCE_ADAPTER_CONTRACT_ABI,
    functionName: "getRefreshState",
    args: [onChainDealId],
  });

  return {
    nextSectorIndex: state.nextSectorIndex,
    pendingCoveredBytes: state.pendingCoveredBytes,
    sweepStartEpoch: BigInt(state.sweepStartEpoch),
    pendingMinimumExpiration: BigInt(state.pendingMinimumExpiration),
    lastCompletedEpoch: BigInt(state.lastCompletedEpoch),
    completedExpiration: BigInt(state.completedExpiration),
    completedResult: Number(state.completedResult),
  };
}
