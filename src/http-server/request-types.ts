export type ApiResponse<T> = {
  data: T;
  success: boolean;
  error?: string;
};

export type PorepMarketDealResponse = {
  onChainDealId: bigint;
  client: string;
  provider: bigint;
  validatorContractAddress: string;
  railId: bigint;
  dealStartEpoch: bigint | null;
  dealEndEpoch: bigint | null;
  state: string;
  allocationsRequiredCount: bigint | null;
  allocationsMatchedCount: bigint | null;
  isAllocationsMatched: boolean;
  isDealEndEpochSetOnChain: boolean;
  allocationIds: bigint[];
  isRailTerminated: boolean;
  terms: PorepMarketDealTermResponse | null;
  requirements: PorepMarketDeaSliThresholdResponse | null;
};

export type PorepMarketDealTermResponse = {
  dealSizeBytes: bigint;
  pricePerSectorPerMonth: bigint;
  durationDays: number;
};

export type PorepMarketDeaSliThresholdResponse = {
  retrievabilityBps: bigint;
  bandwidthMbps: bigint;
  latencyMs: bigint;
  indexingPct: bigint;
};
