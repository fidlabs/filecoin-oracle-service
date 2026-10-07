import { DealState } from "../../utils/types";
import { prismaClient } from "./db-client";
import {
  porepMarkerDealSelect,
  PorepMarketDealResponseDto,
  toPorepMarketDealResponseDto,
} from "./dto/porep-market-deal.dto";

export async function getDealByOnChainIdFromDb(
  onChainDealId: bigint,
): Promise<PorepMarketDealResponseDto | null> {
  const deal = await prismaClient.porep_market_deal.findUnique({
    where: {
      onChainDealId,
    },
    select: porepMarkerDealSelect,
  });

  return deal ? toPorepMarketDealResponseDto(deal) : null;
}

export async function getCountOfCompletedDealsFromDb() {
  const count = await prismaClient.porep_market_deal.count({
    where: {
      state: DealState.Active,
      isEvidenceComplete: true,
    },
  });

  return count;
}

export async function getPaginatedDealsByStateFromDb({
  state,
  page,
  limit,
}: {
  state?: DealState;
  page: number;
  limit: number;
}) {
  const offset = (page - 1) * limit;

  const [deals, totalDeals] = await Promise.all([
    prismaClient.porep_market_deal.findMany({
      where: {
        state: state ? state : undefined,
      },
      orderBy: {
        createdAt: "asc",
      },
      skip: offset,
      take: limit,
      select: porepMarkerDealSelect,
    }),
    prismaClient.porep_market_deal.count({
      where: {
        state: state ? state : undefined,
      },
    }),
  ]);

  const filteredDeals = deals.map(toPorepMarketDealResponseDto);

  return { filteredDeals, totalDeals };
}

export async function getDealsByStateFromDb(
  states: DealState[],
): Promise<PorepMarketDealResponseDto[]> {
  const dealsByState = await prismaClient.porep_market_deal.findMany({
    where: {
      state: {
        in: states,
      },
    },
    select: porepMarkerDealSelect,
  });

  return dealsByState.map(toPorepMarketDealResponseDto);
}

export async function getDealAllocationIdsByOnChainIdFromDb(
  onChainDealId: bigint,
) {
  const dataCapAdapter = await prismaClient.datacap_adapter.findUnique({
    where: {
      onChainDealId,
    },
    select: {
      allocationIds: true,
    },
  });

  return dataCapAdapter?.allocationIds ?? [];
}

export async function getDealClaimsByOnChainIdFromDb(onChainDealId: bigint) {
  const dataCapAdapter = await prismaClient.datacap_adapter.findUnique({
    where: {
      onChainDealId,
    },
    select: {
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
  });

  return dataCapAdapter?.claims ?? [];
}

export async function getDealsFromDb(dealIds: bigint[]) {
  const deals = await prismaClient.porep_market_deal.findMany({
    where: {
      onChainDealId: {
        in: dealIds,
      },
    },
    include: {
      dataCapAdapter: {
        select: {
          isAllocationsMatched: true,
        },
      },
      sectorAdapter: {
        select: {
          receipt: {
            select: {
              sectorCount: true,
            },
          },
        },
      },
    },
  });

  return deals;
}
