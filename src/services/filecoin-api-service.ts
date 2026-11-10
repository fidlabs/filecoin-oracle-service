import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import {
  FilecoinAPIStateGetClaim,
  FilecoinAPIChainHead,
  FilecoinTipSetKey,
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
  tipSetKey: FilecoinTipSetKey | null = null,
): Promise<FilecoinAPIStateSectorPartition> {
  const response = await fetch(SERVICE_CONFIG.RPC_URL, {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "Filecoin.StateSectorPartition",
      params: [spId, sector, tipSetKey],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch sector info: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (data?.error != null) {
    throw new Error(
      `Sector partition RPC error: ${JSON.stringify(data.error)}`,
    );
  }
  if (
    !data?.result ||
    !Number.isSafeInteger(data.result.Partition) ||
    data.result.Partition < 0 ||
    !Number.isSafeInteger(data.result.Deadline) ||
    data.result.Deadline < 0
  ) {
    throw new Error(
      "Sector partition RPC returned no result or an invalid location",
    );
  }
  return {
    Partition: BigInt(data.result.Partition),
    Deadline: BigInt(data.result.Deadline),
  };
}

export async function fetchSectorInfo(
  spId: string,
  sector: number,
  tipSetKey: FilecoinTipSetKey | null = null,
): Promise<FilecoinAPIStateSectorGetInfo | null> {
  const response = await fetch(SERVICE_CONFIG.RPC_URL, {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "Filecoin.StateSectorGetInfo",
      params: [spId, sector, tipSetKey],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch sector info: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (data?.error != null) {
    throw new Error(`Sector info RPC error: ${JSON.stringify(data.error)}`);
  }

  // Only an explicit null confirms absence; a missing result is an RPC failure.
  if (data?.result === null) return null;
  if (
    !data?.result ||
    !Number.isSafeInteger(data.result.SectorNumber) ||
    data.result.SectorNumber !== sector
  ) {
    throw new Error("Sector info RPC returned no result or an invalid sector");
  }
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

export async function fetchChainHead(): Promise<FilecoinAPIChainHead> {
  const response = await fetch(SERVICE_CONFIG.RPC_URL, {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "Filecoin.ChainHead",
      params: [],
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch chain head: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (data?.error != null) {
    throw new Error(`Chain head RPC error: ${JSON.stringify(data.error)}`);
  }

  const head: FilecoinAPIChainHead | undefined = data?.result;
  if (
    !head ||
    !Number.isSafeInteger(head.Height) ||
    head.Height < 0 ||
    !Array.isArray(head.Cids) ||
    head.Cids.length === 0 ||
    head.Cids.some(
      (cid) => !cid || typeof cid["/"] !== "string" || !cid["/"].length,
    )
  ) {
    throw new Error("Chain head RPC returned no result or an invalid tipset");
  }

  return head;
}
