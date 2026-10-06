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
    isRailTerminated: true,
    manifestLocation: true,
    urlFinderSliTargetTriggeredAt: true,
    createdAt: true,
    updatedAt: true,
    lastSyncedAt: true,
    proposedAtEpoch: true,
    evidenceAdapterContractAddress: true,
    evidenceAdapterType: true,
    isEvidenceComplete: true,
    manifestHash: true,
    expiresAtEpoch: true,
    serviceStartEpoch: true,
    serviceEndEpoch: true,
    earlyTerminationEpoch: true,
    minTimeBetweenSettlementsInEpochs: true,
    lastSettledEpoch: true,
    reservedBytes: true,
    committedBytes: true,
    offerId: true,
    providerOrganization: true,
    dealType: true,
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
    dataCapAdapter: {
      select: {
        allocationsRequiredCount: true,
        allocationsMatchedCount: true,
        isAllocationsMatched: true,
        dataCapAllocationStatus: true,
        allocationIds: true,
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
      },
    },
    sectorAdapter: {
      select: {
        receipt: {
          select: {
            providerActorId: true,
            pieceCount: true,
            acceptedPieceCount: true,
            acceptedBytes: true,
            minimumCommitmentEpoch: true,
            activated: true,
            sectorCount: true,
          },
        },
      },
    },
    payment: {
      select: {
        paymentToken: true,
        payee: true,
        pricePer32GiBPerMonth: true,
        billed32GiBUnits: true,
        railMaxRatePerEpoch: true,
      },
    },
    evidenceStatus: {
      select: {
        activeCoveredBytes: true,
        lastEvidenceRefreshEpoch: true,
        reasonCode: true,
        checkedClaims: true,
        totalClaims: true,
        result: true,
      },
    },
  });

export type PorepMarketDealDto = Prisma.porep_market_dealGetPayload<{
  select: typeof porepMarkerDealSelect;
}>;

export type PorepMarketDealResponseDto = Omit<
  PorepMarketDealDto,
  "dataCapAdapter"
> & {
  dataCapAdapter: PorepMarketDealDto["dataCapAdapter"];
  sectorReceipt: NonNullable<PorepMarketDealDto["sectorAdapter"]>["receipt"];
  allocationsRequiredCount: bigint | null;
  allocationsMatchedCount: bigint | null;
  isAllocationsMatched: boolean;
  dataCapAllocationStatus:
    | NonNullable<
        PorepMarketDealDto["dataCapAdapter"]
      >["dataCapAllocationStatus"]
    | undefined;
  allocationIds: bigint[];
  claimsCount: number;
};

export function toPorepMarketDealResponseDto(
  deal: PorepMarketDealDto,
): PorepMarketDealResponseDto {
  return {
    ...deal,
    allocationsRequiredCount:
      deal.dataCapAdapter?.allocationsRequiredCount ?? null,
    allocationsMatchedCount:
      deal.dataCapAdapter?.allocationsMatchedCount ?? null,
    isAllocationsMatched: deal.dataCapAdapter?.isAllocationsMatched ?? false,
    dataCapAllocationStatus: deal.dataCapAdapter?.dataCapAllocationStatus,
    allocationIds: deal.dataCapAdapter?.allocationIds ?? [],
    claimsCount: deal.dataCapAdapter?.claims.length ?? 0,
    sectorReceipt: deal.sectorAdapter?.receipt ?? null,
  };
}
