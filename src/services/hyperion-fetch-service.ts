import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { HyperionFilecoinPayRailResponse } from "../utils/types";

const hyperionServiceLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Hyperion Service] " },
);

async function fetchDataFromHyperion<T>(endpoint: string): Promise<T> {
  const url = `${SERVICE_CONFIG.HYPERION_SERVICE_URL}/${endpoint}`;

  hyperionServiceLogger.info(`Calling Hyperion service at ${url}...`);

  const hyperionResponse = await fetch(url);

  if (!hyperionResponse.ok) {
    throw new Error(
      `Failed to fetch data from Hyperion service: ${hyperionResponse.status} ${hyperionResponse.statusText}`,
    );
  }

  const data = await hyperionResponse.json();
  return data;
}

export async function getFilecoinPayRailFromHyperion(
  railId: bigint,
): Promise<HyperionFilecoinPayRailResponse> {
  hyperionServiceLogger.info(
    `Fetching Filecoin Pay rail ${railId} from Hyperion...`,
  );

  return fetchDataFromHyperion<HyperionFilecoinPayRailResponse>(
    `filecoin-pay/rails/${railId}`,
  );
}
