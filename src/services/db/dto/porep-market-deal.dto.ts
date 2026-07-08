import { Prisma } from "../../../../prisma/generated/client";

export const porepMarkerDealSelect =
  Prisma.validator<Prisma.porep_market_dealSelect>()({
    id: true,
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
    allocationIds: true,
    isRailTerminated: true,
    manifestLocation: true,
    urlFinderSliTargetTriggeredAt: true,
    createdAt: true,
    updatedAt: true,
    lastSyncedAt: true,
    proposedAtEpoch: true,
    evidenceAdapterContractAddress: true,
    manifestHash: true,
    expiresAtEpoch: true,
    serviceStartEpoch: true,
    serviceEndEpoch: true,
    reservedBytes: true,
    committedBytes: true,
    offerId: true,
    providerOrganization: true,
    terms: {
      select: {
        requestedSizeBytes: true,
        durationEpochs: true,
      },
    },
    requiredSLIs: {
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
    payment: {
      select: {
        paymentToken: true,
        pricePer32GiBPerMonth: true,
        billed32GiBUnits: true,
        railMaxRatePerEpoch: true,
      },
    },
  });

export type PorepMarketDealDto = Prisma.porep_market_dealGetPayload<{
  select: typeof porepMarkerDealSelect;
}>;
