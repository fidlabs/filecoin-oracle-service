import { Prisma, SectorStatus } from "../../../prisma/generated/client";
import {
  DealScore,
  DealState,
  GasUsageByFunction,
  OnChainTransactionResult,
  PorepMarketContractDealState,
  PorepMarketDeal,
} from "../../utils/types";
import { getPrismaClient } from "../prisma-service";
import {
  porepMarkerDealSelect,
  PorepMarketDealDto,
} from "./dto/porep-market-deal.dto";

const prismaClient = getPrismaClient();

const hasMatchedAllocations = ({
  allocationsRequiredCount,
  allocationsMatchedCount,
}: {
  allocationsRequiredCount?: bigint;
  allocationsMatchedCount?: bigint;
}) =>
  allocationsRequiredCount !== undefined &&
  allocationsRequiredCount !== null &&
  allocationsMatchedCount !== undefined &&
  allocationsMatchedCount !== null &&
  allocationsRequiredCount === allocationsMatchedCount;

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

export const getChainSectorStatusToDomain = (status: number) => {
  switch (status) {
    case 0:
      return SectorStatus.Dead;
    case 1:
      return SectorStatus.Active;
    case 2:
      return SectorStatus.Faulty;
    default:
      throw new Error(`Unknown sector status from chain: ${status}`);
  }
};

async function getDealsByWhereFromDb(
  where: Prisma.porep_market_dealWhereInput,
): Promise<PorepMarketDealDto[]> {
  const deals: PorepMarketDealDto[] =
    await prismaClient.porep_market_deal.findMany({
      where,
      select: porepMarkerDealSelect,
    });

  return deals;
}

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

export async function storeLastSettlementToDb(
  porepMarketDealId: string,
  epoch: bigint,
  settlementAt = new Date(),
) {
  return prismaClient.porep_market_deal_settlement_history.create({
    data: {
      porepMarketDealId,
      epoch,
      settlementAt,
    },
  });
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
      state: DealState.Completed,
      isRailTerminated: false,
      isAllocationsMatched: true, // IMPORTANT: only consider deals with matching allocation count between expected and actual to avoid setting wrong deal end epoch
    },
  });

  return deals ? deals : [];
}

export async function getCompletedDealsToActivatePayment(blockNumber: bigint) {
  const deals = await prismaClient.porep_market_deal.findMany({
    where: {
      dealEndEpoch: {
        not: null,
        gt: blockNumber,
      },
      state: DealState.Completed,
      isRailTerminated: false,
      activatePaymentAt: null,
      isAllocationsMatched: true, // IMPORTANT: only consider deals with matching allocation count between expected and actual to avoid setting wrong deal end epoch
    },
  });

  return deals ? deals : [];
}

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

export async function getDealsToSetSliFromDb(): Promise<PorepMarketDealDto[]> {
  return await getDealsByWhereFromDb({
    state: DealState.Completed,
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
    urlFinderSliTargetTriggeredAt: null,
  });
}

export async function markUrlFinderSliTargetTriggeredInDb(
  onChainDealId: bigint,
) {
  return prismaClient.porep_market_deal.update({
    where: {
      onChainDealId,
    },
    data: {
      urlFinderSliTargetTriggeredAt: new Date(),
    },
  });
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

      const upserted = await Promise.all(
        deals.map((d) => {
          const isClaimsAllocationsMatched = hasMatchedAllocations(d);

          return tx.porep_market_deal.upsert({
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
              dealStartEpoch: isClaimsAllocationsMatched
                ? d.dealStartEpoch
                : undefined, // set deal start epoch only if all required allocations are matched
              dealEndEpoch: isClaimsAllocationsMatched
                ? d.dealEndEpoch
                : undefined, // set deal end epoch only if all required allocations are matched
              manifestLocation: d.manifestLocation,
              allocationsRequiredCount: d.allocationsRequiredCount,
              allocationsMatchedCount: d.allocationsMatchedCount,
              allocationIds: d.allocationIds,
              history: {
                create: {
                  state: d.state,
                },
              },
              isRailTerminated: false,
              proposedAtBlock: d.proposedAtBlock,
              isAllocationsMatched:
                d.state === DealState.Completed && isClaimsAllocationsMatched, // consider allocations matched only if deal is completed and all required allocations are matched
            },
            update: {
              state: d.state,
              railId: d.railId,
              validatorContractAddress: d.validatorContractAddress,
              dealStartEpoch: isClaimsAllocationsMatched
                ? d.dealStartEpoch
                : undefined, // update deal start epoch only if all required allocations are matched
              dealEndEpoch: isClaimsAllocationsMatched
                ? d.dealEndEpoch
                : undefined, // update deal end epoch only if all required allocations are matched
              allocationIds: d.allocationIds,
              manifestLocation: d.manifestLocation,
              allocationsRequiredCount: d.allocationsRequiredCount,
              allocationsMatchedCount: d.allocationsMatchedCount,
              isAllocationsMatched:
                d.state === DealState.Completed && isClaimsAllocationsMatched
                  ? true
                  : undefined, // don't change if state is diffetent than Completed, e.g Compleated => Terminated, we want to keep the isAllocationsMatched value forever
              lastSyncedAt: new Date(),
            },
          });
        }),
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
              requestedSizeBytes: d.terms.requestedSizeBytes,
              pricePer32GiBPerMonth: d.terms.pricePer32GiBPerMonth,
              durationEpochs: d.terms.durationEpochs,
            },
            update: {
              requestedSizeBytes: d.terms.requestedSizeBytes,
              pricePer32GiBPerMonth: d.terms.pricePer32GiBPerMonth,
              durationEpochs: d.terms.durationEpochs,
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
              retrievabilityBps: d.requiredSLIs.retrievabilityBps,
              bandwidthBytesPerSecond: d.requiredSLIs.bandwidthBytesPerSecond,
              latencyMs: d.requiredSLIs.latencyMs,
              indexingPct: d.requiredSLIs.indexingPct,
            },
            update: {
              retrievabilityBps: d.requiredSLIs.retrievabilityBps,
              bandwidthBytesPerSecond: d.requiredSLIs.bandwidthBytesPerSecond,
              latencyMs: d.requiredSLIs.latencyMs,
              indexingPct: d.requiredSLIs.indexingPct,
            },
          }),
        ),
      );

      await Promise.all(
        deals.map((d) => {
          const porepMarketDealId = allDBDealsMap.get(d.dealId.toString())!.id;

          if (d.claims?.length) {
            return tx.porep_market_deal_claim
              .deleteMany({
                where: {
                  porepMarketDealId,
                },
              })
              .then(() => {
                return tx.porep_market_deal_claim.createMany({
                  data:
                    d.claims?.map((claim) => ({
                      porepMarketDealId,
                      ...claim,
                    })) ?? [],
                });
              });
          }
        }),
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
        state,
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
        state,
      },
    }),
  ]);

  return { filteredDeals, totalDeals };
}

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
        notIn: [DealState.Terminated, DealState.Rejected],
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

export async function getDealsByStateFromDb(
  states: DealState[],
): Promise<PorepMarketDealDto[]> {
  const dealsByState: PorepMarketDealDto[] =
    await prismaClient.porep_market_deal.findMany({
      where: {
        state: {
          in: states,
        },
      },
      select: porepMarkerDealSelect,
    });

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

export async function storeOnChainTransactionToDb(
  porepMarketDealId: string,
  transactionResult: OnChainTransactionResult,
) {
  const { receipt, contractName, functionName } = transactionResult;

  return prismaClient.porep_market_deal_on_chain_transaction.create({
    data: {
      porepMarketDealId,
      contractName,
      functionName,
      detail: {
        create: {
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          fromAddress: receipt.from,
          toAddress: receipt.to?.toString(),
          gasUsed: receipt.gasUsed,
        },
      },
    },
  });
}

export async function getTotalGasUsageGroupedByFunctionFromDb(
  onChainDealId?: bigint,
): Promise<GasUsageByFunction[]> {
  const dealId = onChainDealId ?? null;

  const result = await prismaClient.$queryRaw<GasUsageByFunction[]>`
    SELECT 
    transaction."functionName",
      COUNT(*) AS "transactionCount",
      COALESCE(SUM(transaction_detail."gasUsed"), 0)::bigint AS "gasUsed"
    FROM "porep_market_deal_on_chain_transaction" transaction
    JOIN "porep_market_deal_on_chain_transaction_detail" transaction_detail
      ON transaction_detail."transactionId" = transaction.id
    JOIN "porep_market_deal" deal
    ON deal.id = transaction."porepMarketDealId"
    WHERE 
      (${dealId}::bigint IS NULL OR deal."onChainDealId" = ${dealId}::bigint)
    GROUP BY transaction."functionName"
  `;

  return result;
}

export async function getGasUsageHistoryFromDb({
  onChainDealId,
  functionName,
}: {
  onChainDealId?: bigint;
  functionName?: string;
}) {
  type DailyGasUsageRow = GasUsageByFunction & {
    date: string;
    totalGasUsage: bigint;
  };

  const dealId = onChainDealId ?? null;
  const functionNameFilter = functionName ?? null;

  const rows = await prismaClient.$queryRaw<DailyGasUsageRow[]>`
    WITH filtered_transactions AS (
      SELECT
        DATE_TRUNC('day', tx."createdAt") AS day,
        tx."functionName",
        detail."gasUsed"
      FROM "porep_market_deal_on_chain_transaction" tx
      JOIN "porep_market_deal_on_chain_transaction_detail" detail
        ON detail."transactionId" = tx.id
      JOIN "porep_market_deal" deal
        ON deal.id = tx."porepMarketDealId"
      WHERE
        detail."gasUsed" IS NOT NULL
        AND (${dealId}::bigint IS NULL OR deal."onChainDealId" = ${dealId}::bigint)
        AND (${functionNameFilter}::text IS NULL OR tx."functionName" = ${functionNameFilter}::text)
    ),
    daily_function_usage AS (
      SELECT
        day,
        "functionName",
        COUNT(*)::bigint AS "transactionCount",
        SUM("gasUsed")::bigint AS "gasUsed"
      FROM filtered_transactions
      GROUP BY day, "functionName"
    ),
    daily_usage AS (
      SELECT
        day,
        SUM("gasUsed")::bigint AS "totalGasUsage"
      FROM filtered_transactions
      GROUP BY day
    )
    SELECT
      TO_CHAR(daily.day, 'YYYY-MM-DD') AS date,
      function_usage."functionName",
      function_usage."transactionCount",
      function_usage."gasUsed",
      daily."totalGasUsage"
    FROM daily_usage daily
    JOIN daily_function_usage function_usage
      ON function_usage.day = daily.day
    ORDER BY daily.day ASC, function_usage."functionName" ASC
  `;

  const dailyHistory = new Map<
    string,
    {
      date: string;
      gasUsageByFunction: GasUsageByFunction[];
      totalGasUsage: bigint;
    }
  >();

  for (const row of rows) {
    const dailyUsage = dailyHistory.get(row.date) ?? {
      date: row.date,
      gasUsageByFunction: [],
      totalGasUsage: row.totalGasUsage,
    };

    dailyUsage.gasUsageByFunction.push({
      functionName: row.functionName,
      transactionCount: row.transactionCount,
      gasUsed: row.gasUsed,
    });

    dailyHistory.set(row.date, dailyUsage);
  }

  return [...dailyHistory.values()];
}

export async function updateClaimSectorStatusInDb(
  claimsToUpdate: {
    onChainDealId: bigint;
    provider: bigint;
    claimId: bigint;
    status: SectorStatus;
    sector: bigint;
  }[],
) {
  return prismaClient.$transaction(
    claimsToUpdate.map((claim) =>
      prismaClient.porep_market_deal_claim.update({
        where: {
          claimId_sector_provider: {
            claimId: claim.claimId,
            sector: claim.sector,
            provider: claim.provider,
          },
        },
        data: {
          status: claim.status,
        },
      }),
    ),
  );
}
