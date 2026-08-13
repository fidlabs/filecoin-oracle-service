export interface RecordedExchange {
  method: string;
  url: string;
  status: number;
  body: string;
  errorCode: string | null;
  errorMessage: string | null;
}

export function recordUrlFinderExchanges(): {
  exchanges: RecordedExchange[];
  restore: () => void;
} {
  const exchanges: RecordedExchange[] = [];
  const originalFetch = globalThis.fetch;

  const spy = jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input, init) => {
      const response = await originalFetch(input, init);

      const body = await response.clone().text();

      let errorCode: string | null = null;
      let errorMessage: string | null = null;

      try {
        const parsed = JSON.parse(body) as {
          error?: string;
          error_code?: string;
        };
        errorCode = parsed.error_code ?? null;
        errorMessage = parsed.error ?? null;
      } catch {
        errorMessage = body || null;
      }

      exchanges.push({
        method: init?.method ?? "GET",
        url: typeof input === "string" ? input : input.toString(),
        status: response.status,
        body,
        errorCode,
        errorMessage,
      });

      return response;
    });

  return {
    exchanges,
    restore: () => spy.mockRestore(),
  };
}

export function describeExchange(
  exchange: RecordedExchange | undefined,
): string {
  if (!exchange) {
    return "URL Finder was never called - the request failed before leaving oracle-service.";
  }

  const reason = [
    exchange.errorCode ? `error_code=${exchange.errorCode}` : null,
    exchange.errorMessage ? `error="${exchange.errorMessage}"` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return `${exchange.method} ${exchange.url} -> HTTP ${exchange.status}${
    reason ? ` (${reason})` : ""
  }`;
}
