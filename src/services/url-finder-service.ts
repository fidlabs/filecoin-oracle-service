import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { PorepMarketDealDto } from "./db/dto/porep-market-deal.dto";

const urlFinderServiceLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[URL Finder Service] " },
);

function bandwidthBytesPerSecondToMbps(
  bandwidthBytesPerSecond: bigint,
): number {
  const result = Number((bandwidthBytesPerSecond * 8n) / 1_000_000n);
  return result;
}

export async function createOrUpdatePoRepDealSliTargetInUrlFinder(
  deal: PorepMarketDealDto,
) {
  if (!deal.terms || !deal.requiredSLIs) {
    throw new Error(
      `Deal ${deal.onChainDealId.toString()} has no terms or required SLIs`,
    );
  }

  if (!deal.manifestLocation) {
    throw new Error(
      `Deal ${deal.onChainDealId.toString()} has no manifest location`,
    );
  }

  const url = `${SERVICE_CONFIG.URL_FINDER_SERVICE_URL}/deals/${deal.onChainDealId.toString()}`;

  urlFinderServiceLogger.info(`Calling URL Finder service at ${url}...`);

  const requestBody = {
    client: deal.client,
    deal_size_bytes: deal.terms.requestedSizeBytes.toString(),
    deal_version: "v2",
    manifest_location: deal.manifestLocation,
    manifest_hash: deal.manifestHash,
    provider_id: `f0${deal.provider.toString()}`,
    requirements: {
      bandwidth_mbps: bandwidthBytesPerSecondToMbps(
        deal.requiredSLIs.bandwidthBytesPerSecond,
      ),
      latency_ms: Number(deal.requiredSLIs.latencyMs),
      retrievability_bps: Number(deal.requiredSLIs.retrievabilityBps),
    },
  };

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${SERVICE_CONFIG.URL_FINDER_AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    urlFinderServiceLogger.error(
      `URL Finder PoRep Deal SLI target PUT failed for deal ${deal.onChainDealId.toString()}: ${response.status} ${response.statusText}`,
    );
  }

  await response.text();

  return response.ok;
}
