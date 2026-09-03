import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { CdpDealSliResponse, CdpFilecoinPayRailResponse } from "../utils/types";

const cdpServiceLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[CDP Service] " },
);

async function fetchDataFromCdp<T>(endpoint: string): Promise<T> {
  const url = `${SERVICE_CONFIG.CDP_SERVICE_URL}/${endpoint}`;

  cdpServiceLogger.info(`Calling CDP service at ${url}...`);

  const cdpResponse = await fetch(url);

  if (!cdpResponse.ok) {
    throw new Error(
      `Failed to fetch data from CDP service: ${cdpResponse.status} ${cdpResponse.statusText}`,
    );
  }

  const data = await cdpResponse.json();
  return data;
}

export async function getSliForDeals(
  dealIds: bigint[],
): Promise<CdpDealSliResponse | null> {
  if (dealIds.length === 0) {
    cdpServiceLogger.info("No deal IDs provided for SLI fetch");
    return null;
  }

  const endpoint = `po-rep/average-sli-data?${dealIds
    .map((id) => `dealIds=${id.toString()}`)
    .join("&")}`;

  cdpServiceLogger.info(`Fetching SLI data for deals from CDP service...`);

  const response = await fetchDataFromCdp<CdpDealSliResponse>(endpoint);

  const dealsCount = Object.keys(response || {}).length;

  cdpServiceLogger.info(
    `Fetched SLI data for ${dealsCount} deals from CDP service`,
  );

  return response;
}

export async function getFilecoinPayRailFromCdp(
  railId: bigint,
): Promise<CdpFilecoinPayRailResponse> {
  cdpServiceLogger.info(`Fetching Filecoin Pay rail ${railId} from CDP...`);

  return fetchDataFromCdp<CdpFilecoinPayRailResponse>(
    `filecoin-pay/rails/${railId}`,
  );
}
