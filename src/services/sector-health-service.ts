import { SectorStatus } from "../../prisma/generated/client";
import { batchValidateSectorStatus } from "../blockchain/sector-status-inspector-contract";
import { ChainSectorStatus, FilecoinAPIChainHead } from "../utils/types";
import {
  fetchChainHead,
  fetchSectorInfo,
  fetchStateSectorPartition,
} from "./filecoin-api-service";

export async function getSectorHealthSnapshot(): Promise<FilecoinAPIChainHead> {
  return fetchChainHead();
}

export async function readSectorHealth(
  onChainDealId: bigint,
  provider: bigint,
  sector: bigint,
  snapshot: FilecoinAPIChainHead,
): Promise<SectorStatus> {
  if (sector < 0n || sector > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Sector number cannot be represented safely: ${sector}`);
  }

  const spId = `f0${provider}`;
  const info = await fetchSectorInfo(spId, Number(sector), snapshot.Cids);

  let deadline = -1n;
  let partition = -1n;

  if (info !== null) {
    const location = await fetchStateSectorPartition(
      spId,
      Number(sector),
      snapshot.Cids,
    );
    deadline = location.Deadline;
    partition = location.Partition;
  }

  const statuses =
    info === null
      ? [ChainSectorStatus.Dead]
      : [
          ChainSectorStatus.Active,
          ChainSectorStatus.Faulty,
          ChainSectorStatus.Dead,
        ];

  const results = await batchValidateSectorStatus(
    statuses.map((status) => ({
      onChainDealId,
      sector,
      status,
      deadline,
      partition,
    })),
    BigInt(snapshot.Height),
  );

  const matches = results.filter((result) => result.isValid);

  if (matches.length !== 1)
    throw new Error(`No unambiguous sector status for ${provider}/${sector}`);

  switch (matches[0].call.status) {
    case ChainSectorStatus.Active:
      return SectorStatus.Active;
    case ChainSectorStatus.Faulty:
      return SectorStatus.Faulty;
    case ChainSectorStatus.Dead:
      return SectorStatus.Dead;
  }
}
