import { SERVICE_CONFIG } from "../config/env.js";
import { baseLogger } from "../utils/logger.js";
import { CdpSliResponse } from "../utils/types.js";

async function fetchDataFromCdp(endpoint: string): Promise<CdpSliResponse> {
  const url = `${SERVICE_CONFIG.CDP_SERVICE_URL}/${endpoint}`;

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
    baseLogger.info("No storage providers provided for SLI fetch");
    return null;
  }

  const endpoint = `storage-providers/average-monthly-sli?${storageProviders
    .map((id) => `storageProvidersIds=${id}`)
    .join("&")}`;

  baseLogger.info(`Fetching SLI data from CDP service... ${endpoint}`);

  const response = await fetchDataFromCdp(endpoint);

  const providersCount = Object.keys(response?.data || {}).length;

  baseLogger.info(
    `Fetched SLI data for ${providersCount} providers from CDP service`,
  );

  return response;
}
