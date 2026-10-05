import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import {
  FilecoinAPIStateGetClaim,
  FilecoinAPIStateSectorGetInfo,
  FilecoinAPIStateSectorPartition,
} from "../utils/types";

const filecoinApiChildLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Filecoin API] " },
);

export async function fetchStateSectorPartition(
  spId: string,
  sector: number,
): Promise<FilecoinAPIStateSectorPartition> {
  const response = await fetch(SERVICE_CONFIG.RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "Filecoin.StateSectorPartition",
      params: [spId, sector, null],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch sector info: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  return {
    Partition: BigInt(data?.result.Partition),
    Deadline: BigInt(data?.result.Deadline),
  } as FilecoinAPIStateSectorPartition;
}

export async function fetchSectorInfo(
  spId: string,
  sector: number,
): Promise<FilecoinAPIStateSectorGetInfo> {
  const response = await fetch(SERVICE_CONFIG.RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "Filecoin.StateSectorGetInfo",
      params: [spId, sector, null],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch sector info: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data.result as FilecoinAPIStateSectorGetInfo;
}

export async function fetchClaims(
  spId: string,
  claimId: number,
): Promise<FilecoinAPIStateGetClaim | null> {
  const response = await fetch(SERVICE_CONFIG.RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 0,
      method: "Filecoin.StateGetClaim",
      params: [spId, claimId, null],
    }),
  });

  if (!response.ok) {
    filecoinApiChildLogger.warn(
      `Failed to fetch claim info for SP ${spId} and claim ID ${claimId}: ${response.status} ${response.statusText}`,
    );
    return null;
  }

  const data = await response.json();
  return data.result as FilecoinAPIStateGetClaim;
}

export async function fetchSectorLocation(
  spId: string,
  sector: bigint,
): Promise<FilecoinAPIStateSectorPartition | null> {
  const response = await fetch(SERVICE_CONFIG.RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "Filecoin.StateSectorPartition",
      params: [spId, Number(sector), null],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch sector location: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (data?.error) {
    const sectorInfo = await fetchSectorInfo(spId, Number(sector));

    if (sectorInfo) {
      throw new Error(
        `Failed to fetch sector location for SP ${spId} and sector ${sector}: ${JSON.stringify(data.error)}`,
      );
    }

    filecoinApiChildLogger.warn(
      `Sector ${sector} of SP ${spId} is not present in miner state`,
    );
    return null;
  }

  if (!data?.result) {
    filecoinApiChildLogger.warn(
      `Sector ${sector} of SP ${spId} has no deadline/partition location`,
    );
    return null;
  }

  return {
    Partition: BigInt(data.result.Partition),
    Deadline: BigInt(data.result.Deadline),
  };
}
