import { SERVICE_CONFIG } from "../../src/config/env";

export type UrlFinderMeasurementState =
  | "missing"
  | "fresh"
  | "stale"
  | "failed"
  | "skipped";

export interface UrlFinderPorepSlis {
  retrievability_bps: number | null;
  bandwidth_mbps: number | null;
  latency_ms: number | null;
  indexing_pct: number | null;
}

export interface UrlFinderDealMeasurement {
  deal_id: string;
  measurement_state: UrlFinderMeasurementState;
  porep_slis: UrlFinderPorepSlis;
  piece_count: number;
  sampled_piece_count: number | null;
  success_count: number;
  failed_count: number;
  result_code: string | null;
  error_code: string | null;
  tested_at: string | null;
  bms_results: unknown[];
}

async function requestUrlFinder<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const url = `${SERVICE_CONFIG.URL_FINDER_SERVICE_URL}${path}`;
  const method = init.method ?? "GET";

  const response = await fetch(url, {
    ...init,
    headers: { accept: "application/json", ...init.headers },
  });

  const body = await response.text();

  if (!response.ok) {
    let reason = body;
    try {
      const parsed = JSON.parse(body) as {
        error?: string;
        error_code?: string;
      };
      reason =
        [
          parsed.error_code ? `error_code=${parsed.error_code}` : null,
          parsed.error ? `error="${parsed.error}"` : null,
        ]
          .filter(Boolean)
          .join(" ") || body;
    } catch {
      reason = body;
    }

    throw new Error(`${method} ${url} -> HTTP ${response.status} (${reason})`);
  }

  return JSON.parse(body) as T;
}

export function triggerDealMeasurementRun(
  dealId: bigint,
): Promise<UrlFinderDealMeasurement> {
  return requestUrlFinder<UrlFinderDealMeasurement>(`/deals/${dealId}/runs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_CONFIG.URL_FINDER_AUTH_TOKEN}`,
    },
  });
}

export function getLatestDealSliEvidence(
  dealId: bigint,
): Promise<UrlFinderDealMeasurement> {
  return requestUrlFinder<UrlFinderDealMeasurement>(`/deals/${dealId}/latest`, {
    method: "GET",
  });
}

export function hasAnySliValue(slis: UrlFinderPorepSlis): boolean {
  return (
    slis.retrievability_bps !== null ||
    slis.bandwidth_mbps !== null ||
    slis.latency_ms !== null ||
    slis.indexing_pct !== null
  );
}
