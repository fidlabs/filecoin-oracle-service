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
  return Number((bandwidthBytesPerSecond * 8n) / 1_000_000n);
}

export async function createOrUpdatePoRepDealSliTargetInUrlFinder(
  deal: PorepMarketDealDto,
) {
  if (!deal.terms || !deal.requirements) {
    throw new Error(
      `Deal ${deal.onChainDealId.toString()} has no terms or requirements`,
    );
  }

  if (!deal.manifestLocation) {
    throw new Error(
      `Deal ${deal.onChainDealId.toString()} has no manifest location`,
    );
  }

  const url = `${SERVICE_CONFIG.URL_FINDER_SERVICE_URL}/deals/${deal.onChainDealId.toString()}`;

  urlFinderServiceLogger.info(`Calling URL Finder service at ${url}...`);

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${SERVICE_CONFIG.URL_FINDER_AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client: deal.client,
      deal_size_bytes: deal.terms.dealSizeBytes.toString(),
      deal_version: "v2",
      manifest_location: deal.manifestLocation,
      //manifest_hash: deal.manifestHash, TODO: Add field from new version of porep market contract
      provider_id: `f0${deal.provider.toString()}`,
      requirements: {
        bandwidth_mbps: bandwidthBytesPerSecondToMbps(
          deal.requirements.bandwidthBytesPerSecond,
        ),
        latency_ms: Number(deal.requirements.latencyMs),
        retrievability_bps: Number(deal.requirements.retrievabilityBps),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `URL Finder PoRep Deal SLI target PUT failed for deal ${deal.onChainDealId.toString()}: ${response.status} ${response.statusText}`,
    );
  }

  await response.text();
}
