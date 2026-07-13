import { Prisma } from "../../../prisma/generated/client";
import { DealState } from "../../utils/types";
import { prismaClient } from "./db-client";
import { toPrismaDealState } from "./deal-state.db";
import { DataCapAllocationStatus } from "./deal-status.db";
import {
  porepMarkerDealSelect,
  PorepMarketDealDto,
} from "./dto/porep-market-deal.dto";

async function getDealsByWhereFromDb(
  where: Prisma.porep_market_dealWhereInput,
): Promise<PorepMarketDealDto[]> {
  const deals = await prismaClient.porep_market_deal.findMany({
    where,
    select: porepMarkerDealSelect,
  });

  return deals;
}

export async function getCompletedDealsToSettleFromDb() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const deals = await prismaClient.porep_market_deal.findMany({
    where: {
      state: toPrismaDealState(DealState.Active),
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
              activatePaymentAt: {
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

  return deals;
}

export async function getCompletedDealsToCheckClaimTerminationFromDb() {
  const deals = await prismaClient.porep_market_deal.findMany({
    where: {
      dealEndEpoch: {
        not: null,
      },
      state: toPrismaDealState(DealState.Active),
      isRailTerminated: false,
      isAllocationsMatched: true, // IMPORTANT: only consider deals with matching allocation count between expected and actual to avoid setting wrong deal end epoch
    },
    include: {
      claims: true,
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
      state: toPrismaDealState(DealState.Active),
      isRailTerminated: false,
      isAllocationsMatched: true, // IMPORTANT: only consider deals with matching allocation count between expected and actual to avoid setting wrong deal end epoch
    },
  });

  return deals ? deals : [];
}

export async function getDealsToFinalizeFromDb(currentEpoch: bigint) {
  return getDealsByWhereFromDb({
    state: toPrismaDealState(DealState.Active),
    serviceEndEpoch: {
      not: null,
      lte: currentEpoch,
    },
  });
}

export async function getDealsToSetSliFromDb(): Promise<PorepMarketDealDto[]> {
  return await getDealsByWhereFromDb({
    state: toPrismaDealState(DealState.Active),
    isAllocationsMatched: true,
    isRailTerminated: false,
    activatePaymentAt: {
      not: null,
    },
  });
}

export async function getDealsToRefreshEvidenceStatusFromDb(): Promise<
  PorepMarketDealDto[]
> {
  return await getDealsByWhereFromDb({
    state: toPrismaDealState(DealState.Active),
    isAllocationsMatched: true,
    isRailTerminated: false,
    activatePaymentAt: {
      not: null,
    },
  });
}

export async function getDealsToSyncUrlFinderSliTargetsFromDb(): Promise<
  PorepMarketDealDto[]
> {
  return await getDealsByWhereFromDb({
    state: DealState.Active,
    urlFinderSliTargetTriggeredAt: null,
  });
}

export async function getDealsToActivateDCEvidenceFromDb(): Promise<
  PorepMarketDealDto[]
> {
  return await getDealsByWhereFromDb({
    dataCapAllocationStatus: DataCapAllocationStatus.Allocated,
    isRailTerminated: false,
  });
}
