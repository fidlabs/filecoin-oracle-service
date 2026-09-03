export const MAX_LATENCY_MS = 2 ** 16 - 1;

export function parseLatencyMs(latencyMs: number | string | null): number {
  if (latencyMs === null || latencyMs === "") {
    return MAX_LATENCY_MS;
  }

  const parsedLatencyMs = Number(latencyMs);

  if (
    !Number.isFinite(parsedLatencyMs) ||
    parsedLatencyMs < 0 ||
    parsedLatencyMs > MAX_LATENCY_MS
  ) {
    return MAX_LATENCY_MS;
  }

  return Math.floor(parsedLatencyMs);
}
