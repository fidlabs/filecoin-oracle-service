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
