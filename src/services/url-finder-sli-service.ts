import { z } from "zod";
import { SERVICE_CONFIG } from "../config/env";

export interface SliPeriod {
  start: Date;
  end: Date;
}

const metric = z.number().finite().nonnegative().nullable();
const measurementSchema = z.object({
  tested_at: z.iso.datetime({ offset: true }),
  porep_slis: z.object({
    retrievability_bps: metric.refine(
      (value) => value === null || value <= 10000,
    ),
    bandwidth_mbps: metric,
    latency_ms: metric,
  }),
});

const responseSchema = z.object({
  deal_id: z.string(),
  measurements: z.array(measurementSchema),
});

export type UrlFinderSliMeasurement = z.infer<typeof measurementSchema>;

export function getSliPeriod(end = new Date()): SliPeriod {
  return {
    start: new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(end.getTime()),
  };
}

function validatePeriod({ start, end }: SliPeriod) {
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start >= end
  ) {
    throw new Error(
      "SLI period must contain valid dates with start before end",
    );
  }
}

export async function getSliMeasurementsForDeal(
  dealId: bigint,
  period: SliPeriod,
): Promise<UrlFinderSliMeasurement[]> {
  validatePeriod(period);

  const baseUrl = SERVICE_CONFIG.URL_FINDER_SERVICE_URL.replace(/\/$/, "");
  const url = new URL(`${baseUrl}/deals/${dealId.toString()}/measurements`);

  url.searchParams.set("start", period.start.toISOString());
  url.searchParams.set("end", period.end.toISOString());

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${SERVICE_CONFIG.URL_FINDER_AUTH_TOKEN}`,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(
      `URL Finder SLI request failed for deal ${dealId}: ${response.status} ${response.statusText}`,
    );
  }

  const data = responseSchema.parse(await response.json());

  if (data.deal_id !== dealId.toString()) {
    throw new Error(
      `URL Finder returned SLI measurements for a different deal: ${data.deal_id}`,
    );
  }
  return data.measurements;
}

export function averageSliMeasurements(
  measurements: UrlFinderSliMeasurement[],
  period: SliPeriod,
) {
  validatePeriod(period);
  const inPeriod = measurements.filter(({ tested_at }) => {
    const time = new Date(tested_at).getTime();
    return time >= period.start.getTime() && time < period.end.getTime();
  });

  const average = (key: keyof UrlFinderSliMeasurement["porep_slis"]) => {
    const values = inPeriod
      .map((measurement) => measurement.porep_slis[key])
      .filter((value): value is number => value !== null);

    return values.length === 0
      ? null
      : values.reduce((sum, value) => sum + value / values.length, 0);
  };

  return {
    retrievabilityBps: average("retrievability_bps"),
    bandwidthMbps: average("bandwidth_mbps"),
    latencyMs: average("latency_ms"),
  };
}
