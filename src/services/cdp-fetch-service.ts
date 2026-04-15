import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { CdpSliResponse } from "../utils/types";

const cdpServiceLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[CDP Service] " },
);

async function fetchDataFromCdp(endpoint: string): Promise<CdpSliResponse> {
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

export async function getSliForStorageProviders(
  storageProviders: string[],
): Promise<CdpSliResponse | null> {
  if (storageProviders.length === 0) {
    cdpServiceLogger.info("No storage providers provided for SLI fetch");
    return null;
  }

  const endpoint = `storage-providers/average-sli-data?${storageProviders
    .map((id) => `storageProvidersIds=${id}`)
    .join("&")}`;

  cdpServiceLogger.info(`Fetching SLI data from CDP service...`);

  const response = await fetchDataFromCdp(endpoint);

  const providersCount = Object.keys(response?.data || {}).length;

  cdpServiceLogger.info(
    `Fetched SLI data for ${providersCount} providers from CDP service`,
  );

  return response;
}
