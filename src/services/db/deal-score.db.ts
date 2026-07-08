import { DealScore, DealState } from "../../utils/types";
import { prismaClient } from "./db-client";
import { toPrismaDealState } from "./deal-state.db";

export function storeDealsScoreToDb(data: DealScore[]) {
  return prismaClient.porep_market_deal_score.createMany({
    data,
  });
}

export async function getDealScoreByOnChainDealIdFromDb(onChainDealId: bigint) {
  const deal = await prismaClient.porep_market_deal.findFirst({
    where: {
      onChainDealId,
    },
    include: {
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
        take: 1,
      },
    },
  });

  return deal?.score?.[0] ?? null;
}

export async function getDealsToCalculateScoreFromDb() {
  const deals = await prismaClient.porep_market_deal.findMany({
    where: {
      state: {
        notIn: [
          DealState.Finalized,
          DealState.Rejected,
          DealState.Expired,
          DealState.Terminated,
        ].map(toPrismaDealState),
      },
    },
    select: {
      id: true,
      onChainDealId: true,
      provider: true,
      requiredSLIs: {
        select: {
          retrievabilityBps: true,
          bandwidthBytesPerSecond: true,
          latencyMs: true,
          indexingPct: true,
        },
      },
    },
  });

  return deals;
}
