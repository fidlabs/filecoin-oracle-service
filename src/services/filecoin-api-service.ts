import { SERVICE_CONFIG } from "../config/env";
import {
  FilecoinAPIStateGetClaim,
  FilecoinAPIStateSectorExpiration,
  FilecoinAPIStateSectorGetInfo,
} from "../utils/types";

export async function fetchStateSectorExpiration(
  spId: string,
  sector: number,
): Promise<FilecoinAPIStateSectorExpiration> {
  const response = await fetch(SERVICE_CONFIG.RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "Filecoin.StateSectorExpiration",
      params: [spId, sector, null],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch sector expiration: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  return data.result as FilecoinAPIStateSectorExpiration;
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
): Promise<FilecoinAPIStateGetClaim> {
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
    throw new Error(
      `Failed to fetch sector info: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data.result as FilecoinAPIStateGetClaim;
}
