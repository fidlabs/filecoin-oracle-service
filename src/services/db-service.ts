import {
  DealState,
  PorepMarketContractDealState,
  PorepMarketDeal,
  ProviderScore,
} from "../utils/types";
import { getPrismaClient } from "./prisma-service";

const prismaClient = getPrismaClient();

export const getChainStateToDomain = (state: number): DealState => {
  switch (state) {
    case PorepMarketContractDealState.Proposed:
      return DealState.Proposed;
    case PorepMarketContractDealState.Accepted:
      return DealState.Accepted;
    case PorepMarketContractDealState.Completed:
      return DealState.Completed;
    case PorepMarketContractDealState.Rejected:
      return DealState.Rejected;
    case PorepMarketContractDealState.Terminated:
      return DealState.Terminated;
    default:
      throw new Error(`Unknown state from chain: ${state}`);
  }
};

export async function getCompletedDealsToSettleFromDb() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const deals = await prismaClient.porep_market_deal.findMany({
    where: {
      state: DealState.Completed,
      isRailTerminated: false,
      isAllocationsMatched: true,
      OR: [
        {
          AND: [
            {
              settlement_history: {
                some: {},
              },
            },
            {
              settlement_history: {
                none: {
                  settlementAt: {
                    gt: thirtyDaysAgo,
                  },
                },
              },
            },
          ],
        },
        {
          AND: [
            {
              settlement_history: {
                none: {},
              },
            },
            {
              modifyRailPaymentAt: {
                not: null,
                lte: thirtyDaysAgo,
              },
            },
          ],
        },
      ],
    },
    include: {
      settlement_history: {
        orderBy: {
          settlementAt: "desc",
        },
        take: 1,
      },
    },
  });

  return deals ?? [];
}

export async function getCompletedDealsToCheckClaimTerminationFromDb() {
  const deals = await prismaClient.porep_market_deal.findMany({
    where: {
      dealEndEpoch: {
        not: null,
      },
      state: DealState.Completed,
      isRailTerminated: false,
      isAllocationsMatched: true, // IMPORTANT: only consider deals with matching allocation count between expected and actual to avoid setting wrong deal end epoch
    },
  });

  return deals ? deals : [];
}

export async function getCompletedDealsToTerminateFromDb(blockNumber: bigint) {
  const deals = await prismaClient.porep_market_deal.findMany({
    where: {
      dealEndEpoch: {
        not: null,
        lte: blockNumber,
      },
      state: DealState.Completed,
      isRailTerminated: false,
      isAllocationsMatched: true, // IMPORTANT: only consider deals with matching allocation count between expected and actual to avoid setting wrong deal end epoch
    },
  });

  return deals ? deals : [];
}

export async function getCompletedDealsToSetEndEpochFromDb(
  blockNumber: bigint,
) {
  const deals = await prismaClient.porep_market_deal.findMany({
    where: {
      dealEndEpoch: {
        not: null,
        gt: blockNumber,
      },
      state: DealState.Completed,
      isRailTerminated: false,
      isDealEndEpochSetOnChain: false,
      isAllocationsMatched: true, // IMPORTANT: only consider deals with matching allocation count between expected and actual to avoid setting wrong deal end epoch
    },
  });

  return deals ? deals : [];
}

export async function getDealByOnChainIdFromDb(onChainDealId: bigint) {
  const deal = await prismaClient.porep_market_deal.findUnique({
    where: {
      onChainDealId,
    },
    include: {
      terms: true,
      requirements: true,
    },
  });

  return deal;
}

export async function syncPoRepMarketContractDealsWithDb(
  deals: PorepMarketDeal[],
) {
  if (!deals.length) return;

  return prismaClient.$transaction(
    async (tx) => {
      // 1. FETCH EXISTING (for history diff)
      const existing = await tx.porep_market_deal.findMany({
        where: {
          onChainDealId: {
            in: deals.map((d) => d.dealId),
          },
        },
        select: {
          id: true,
          onChainDealId: true,
          state: true,
        },
      });

      const existingDealsMap = new Map(
        existing.map((dbDeals) => [dbDeals.onChainDealId.toString(), dbDeals]),
      );

      // 2 .UPSERT DEALS (core entity only)
      const upserted = await Promise.all(
        deals.map((d) =>
          tx.porep_market_deal.upsert({
            where: {
              onChainDealId: d.dealId,
            },
            create: {
              onChainDealId: d.dealId,
              client: d.client,
              provider: d.provider,
              railId: d.railId,
              validatorContractAddress: d.validatorContractAddress,
              state: d.state,
              allocationsRequiredCount: d.allocationsRequiredCount,
              allocationsMatchedCount: d.allocationsMatchedCount,
              isAllocationsMatched: d.isAllocationsMatched,
              allocationIds: d.allocationIds,
              isRailTerminated: d.isRailTerminated,
            },
            update: {
              state: d.state,
              railId: d.railId,
              validatorContractAddress: d.validatorContractAddress,
              dealStartEpoch: d.dealStartEpoch,
              dealEndEpoch: d.dealEndEpoch,
              allocationIds: d.allocationIds,
              allocationsRequiredCount: d.allocationsRequiredCount,
              allocationsMatchedCount: d.allocationsMatchedCount,
              isAllocationsMatched: d.isAllocationsMatched,
              lastSyncedAt: new Date(),
            },
          }),
        ),
      );

      const allUpsertedDealsMap = new Map(
        upserted.map((dbDeals) => [dbDeals.onChainDealId.toString(), dbDeals]),
      );

      const allDBDealsMap = new Map([
        ...existingDealsMap,
        ...allUpsertedDealsMap,
      ]);

      // 3. UPSERT TERMS
      await Promise.all(
        deals.map((d) =>
          tx.porep_market_deal_terms.upsert({
            where: {
              porepMarketDealId: allDBDealsMap.get(d.dealId.toString())!.id,
            },
            create: {
              porepMarketDealId: allDBDealsMap.get(d.dealId.toString())!.id,
              onChainDealId: d.dealId,
              dealSizeBytes: d.terms.dealSizeBytes,
              pricePerSectorPerMonth: d.terms.pricePerSectorPerMonth,
              durationDays: d.terms.durationDays,
            },
            update: {
              dealSizeBytes: d.terms.dealSizeBytes,
              pricePerSectorPerMonth: d.terms.pricePerSectorPerMonth,
              durationDays: d.terms.durationDays,
            },
          }),
        ),
      );

      // 4. UPSERT REQUIREMENTS
      await Promise.all(
        deals.map((d) =>
          tx.porep_market_deal_requirement.upsert({
            where: {
              porepMarketDealId: allDBDealsMap.get(d.dealId.toString())!.id,
            },
            create: {
              porepMarketDealId: allDBDealsMap.get(d.dealId.toString())!.id,
              onChainDealId: d.dealId,
              retrievabilityBps: d.requirements.retrievabilityBps,
              bandwidthMbps: d.requirements.bandwidthMbps,
              latencyMs: d.requirements.latencyMs,
              indexingPct: d.requirements.indexingPct,
            },
            update: {
              retrievabilityBps: d.requirements.retrievabilityBps,
              bandwidthMbps: d.requirements.bandwidthMbps,
              latencyMs: d.requirements.latencyMs,
              indexingPct: d.requirements.indexingPct,
            },
          }),
        ),
      );

      // 5. HISTORY (state diff)
      const historyRows = deals
        .map((d) => {
          const prev = existingDealsMap.get(d.dealId.toString());
          if (!prev) return null;

          if (prev.state === d.state) return null;

          return {
            porepMarketDealId: prev.id,
            state: d.state,
          };
        })
        .filter(Boolean) as {
        porepMarketDealId: string;
        state: DealState;
      }[];

      // 6. INSERT HISTORY
      if (historyRows.length > 0) {
        await tx.porep_market_deal_history.createMany({
          data: historyRows,
        });
      }

      return;
    },
    {
      timeout: 1 * 60 * 1000,
    },
  );
}

export async function getCountOfCompletedDealsFromDb() {
  const count = await prismaClient.porep_market_deal.count({
    where: {
      state: DealState.Completed,
      isAllocationsMatched: true,
    },
  });

  return count;
}

export async function getDealsByStateFromDb({
  state,
  page,
  limit,
}: {
  state: DealState;
  page: number;
  limit: number;
}) {
  const offset = (page - 1) * limit;

  const deals = await prismaClient.porep_market_deal.findMany({
    where: {
      state,
    },
    skip: offset,
    take: limit,
    select: {
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
      isDealEndEpochSetOnChain: true,
      allocationIds: true,
      isRailTerminated: true,
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
          bandwidthMbps: true,
          latencyMs: true,
          indexingPct: true,
        },
      },
    },
  });

  return deals;
}

export function storeProviderScoreToDb(data: ProviderScore[]) {
  return prismaClient.provider_score.createMany({
    data: data.map((d) => ({
      providerId: d.providerId,
      calculatedScore: d.calculatedScore,
      retrievabilityBps: d.slis.retrievabilityBps,
      bandwidthMbps: d.slis.bandwidthMbps,
      latencyMs: d.slis.latencyMs,
      indexingPct: d.slis.indexingPct,
    })),
  });
}
