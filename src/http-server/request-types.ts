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
  activatePaymentAt: Date | null;
  allocationIds: bigint[];
  isRailTerminated: boolean;
  terms: PorepMarketDealTermResponse | null;
  requiredSLIs: PorepMarketDeaSliThresholdResponse | null;
};

export type PorepMarketDealTermResponse = {
  requestedSizeBytes: bigint;
  pricePer32GiBPerMonth: bigint;
  durationEpochs: bigint;
};

export type PorepMarketDeaSliThresholdResponse = {
  retrievabilityBps: bigint;
  bandwidthMbps: bigint;
  latencyMs: bigint;
  indexingPct: bigint;
};
