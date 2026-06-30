import { Prisma } from "../../../../prisma/generated/client";

export const porepMarkerDealSelect =
  Prisma.validator<Prisma.porep_market_dealSelect>()({
    onChainDealId: true,
    client: true,
    provider: true,
    validatorContractAddress: true,
    railId: true,
    dealStartEpoch: true,
    dealEndEpoch: true,
    state: true,
    allocationsRequiredCount: true,
    allocationsMatchedCount: true,
    isAllocationsMatched: true,
    activatePaymentAt: true,
    allocationIds: true,
    isRailTerminated: true,
    manifestLocation: true,
    urlFinderSliTargetTriggeredAt: true,
    createdAt: true,
    updatedAt: true,
    lastSyncedAt: true,
    proposedAtBlock: true,
    terms: {
      select: {
        dealSizeBytes: true,
        pricePerSectorPerMonth: true,
        durationDays: true,
      },
    },
    requirements: {
      select: {
        retrievabilityBps: true,
        bandwidthBytesPerSecond: true,
        latencyMs: true,
        indexingPct: true,
      },
    },
    score: {
      select: {
        calculatedScore: true,
        averageBandwidthMbps: true,
        averageRetrievabilityBps: true,
        averageLatencyMs: true,
        averageIndexingPct: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    },
    history: {
      select: {
        state: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    },
    settlement_history: {
      select: {
        epoch: true,
        settlementAt: true,
      },
      orderBy: {
        settlementAt: "desc",
      },
    },
    claims: {
      select: {
        claimId: true,
        sector: true,
        status: true,
        provider: true,
        client: true,
        data: true,
        size: true,
        term_min: true,
        term_max: true,
        term_start: true,
      },
    },
  });

export type PorepMarketDealDto = Prisma.porep_market_dealGetPayload<{
  select: typeof porepMarkerDealSelect;
}>;
