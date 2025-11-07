import { SERVICE_CONFIG } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { CdpSliResponse } from "../utils/types.js";

async function fetchDataFromCdp(endpoint: string): Promise<CdpSliResponse[]> {
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

export async function getSliForStorageProviders(storageProviders: string[]) {
  const providersParam = storageProviders.join(",");
  const endpoint = `sli-storage-providers/?providers=${encodeURIComponent(
    providersParam,
  )}`; //TODO: adjust enpoint if needed

  logger.info("Fetching SLI data from CDP service...");

  const response = await fetchDataFromCdp(endpoint);

  logger.info(
    `Fetched SLI data for ${response.length} providers from CDP service`,
  );

  return response;
}
