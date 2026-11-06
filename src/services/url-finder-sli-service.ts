import { z } from "zod";
import { SERVICE_CONFIG } from "../config/env";

export interface SliPeriod {
  start: Date;
  end: Date;
}

const metric = z.number().finite().nonnegative().nullable();
const measurementSchema = z.object({
  deal_id: z.string(),
  tested_at: z.iso.datetime({ offset: true }).nullable(),
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
  data: z.record(z.string(), z.array(measurementSchema)),
  next_cursor: z.string().min(1).nullable(),
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

  const baseUrl = SERVICE_CONFIG.URL_FINDER_SERVICE_URL.replace(/\/+$/, "");

  const url = new URL(`${baseUrl}/deals/${dealId.toString()}/history/sli`);

  url.searchParams.set("from", period.start.toISOString().slice(0, 10));
  url.searchParams.set("to", period.end.toISOString().slice(0, 10));
  url.searchParams.set("limit", "500");

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
  const measurements = Object.values(data.data).flat();

  if (
    data.deal_id !== dealId.toString() ||
    measurements.some(
      (measurement) => measurement.deal_id !== dealId.toString(),
    )
  ) {
    throw new Error(
      "URL Finder returned SLI measurements for a different deal",
    );
  }

  if (data.next_cursor !== null) {
    throw new Error(
      `URL Finder SLI history exceeds the 500-measurement limit for deal ${dealId}`,
    );
  }

  return measurements;
}

function isInPeriod({ tested_at }: UrlFinderSliMeasurement, period: SliPeriod) {
  if (tested_at === null) return false;
  const time = new Date(tested_at).getTime();
  return time >= period.start.getTime() && time < period.end.getTime();
}

export interface SliAverages {
  retrievabilityBps: number | null;
  bandwidthMbps: number | null;
  latencyMs: number | null;
}

export function averageSliMeasurements(
  measurements: UrlFinderSliMeasurement[],
  period: SliPeriod,
): SliAverages {
  validatePeriod(period);

  const inPeriod = measurements.filter((measurement) =>
    isInPeriod(measurement, period),
  );

  const average = (values: (number | null)[]): number | null => {
    const availableValues = values.filter(
      (value): value is number => value !== null,
    );

    return availableValues.length === 0
      ? null
      : availableValues.reduce((sum, value) => sum + value, 0) /
          availableValues.length;
  };

  return {
    retrievabilityBps: average(
      inPeriod.map((measurement) => measurement.porep_slis.retrievability_bps),
    ),
    bandwidthMbps: average(
      inPeriod.map((measurement) => measurement.porep_slis.bandwidth_mbps),
    ),
    latencyMs: average(
      inPeriod.map((measurement) => measurement.porep_slis.latency_ms),
    ),
  };
}
