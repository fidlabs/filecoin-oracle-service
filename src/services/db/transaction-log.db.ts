import {
  GasUsageByFunction,
  OnChainTransactionResult,
} from "../../utils/types";
import { prismaClient } from "./db-client";

export async function storeOnChainTransactionToDb(
  onChainDealId: bigint,
  transactionResult: OnChainTransactionResult,
) {
  const { receipt, contractName, functionName } = transactionResult;

  return prismaClient.porep_market_deal_on_chain_transaction.create({
    data: {
      deal: {
        connect: {
          onChainDealId,
        },
      },
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
