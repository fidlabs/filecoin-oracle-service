import { DealState } from "../../utils/types";
import { prismaClient } from "./db-client";
import { toPrismaDealState } from "./deal-state.db";
import {
  porepMarkerDealSelect,
  PorepMarketDealDto,
} from "./dto/porep-market-deal.dto";

export async function getDealByOnChainIdFromDb(
  onChainDealId: bigint,
): Promise<PorepMarketDealDto | null> {
  const deal: PorepMarketDealDto | null =
    await prismaClient.porep_market_deal.findUnique({
      where: {
        onChainDealId,
      },
      select: porepMarkerDealSelect,
    });

  return deal;
}

export async function getCountOfCompletedDealsFromDb() {
  const count = await prismaClient.porep_market_deal.count({
    where: {
      state: DealState.Active,
      isAllocationsMatched: true,
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

  const [filteredDeals, totalDeals] = await Promise.all([
    prismaClient.porep_market_deal.findMany({
      where: {
        state: state ? toPrismaDealState(state) : undefined,
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
        state: state ? toPrismaDealState(state) : undefined,
      },
    }),
  ]);

  return { filteredDeals, totalDeals };
}

export async function getDealsByStateFromDb(
  states: DealState[],
): Promise<PorepMarketDealDto[]> {
  const dealsByState: PorepMarketDealDto[] =
    (await prismaClient.porep_market_deal.findMany({
      where: {
        state: {
          in: states.map(toPrismaDealState),
        },
      },
      select: porepMarkerDealSelect,
    })) as unknown as PorepMarketDealDto[];

  return dealsByState;
}

export async function getDealsFromDb(dealIds: bigint[]) {
  const deals = await prismaClient.porep_market_deal.findMany({
    where: {
      onChainDealId: {
        in: dealIds,
      },
    },
  });

  return deals;
}
