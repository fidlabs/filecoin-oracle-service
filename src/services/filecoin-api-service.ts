import { SERVICE_CONFIG } from "../config/env.js";
import {
  FilecoinAPIStateGetClaim,
  FilecoinAPIStateSectorGetInfo,
} from "../utils/types.js";

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
