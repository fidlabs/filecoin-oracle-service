import { FastifyPluginOptions } from "fastify";
import {
  getGasUsageHistoryFromDb,
  getTotalGasUsageGroupedByFunctionFromDb,
} from "../../../services/db/db-service";
import { FastifyTypedInstance } from "../../server";
import { GetByIdDealIdQuerySchema } from "../deals/schema";
import { GetGasUsageHistoryQuerySchema } from "./schema";

export function onChainTransactionsRoutes(
  fastify: FastifyTypedInstance,
  options: FastifyPluginOptions,
  done: (err?: Error) => void,
) {
  fastify.get(
    "/gas-usage",
    {
      schema: {
        description:
          "Get gas usage grouped by function (optionally filtered by on-chain deal ID)",
        querystring: GetByIdDealIdQuerySchema,
      },
    },
    async (request, reply) => {
      const { onChainDealId } = request.query;

      const gasUsageByFunction = await getTotalGasUsageGroupedByFunctionFromDb(
        onChainDealId ? BigInt(onChainDealId) : undefined,
      );

      return reply.success({
        onChainDealId: onChainDealId ? BigInt(onChainDealId) : null,
        gasUsageByFunction,
        totalGasUsage: gasUsageByFunction.reduce(
          (acc, curr) => acc + (curr.gasUsed ?? 0n),
          0n,
        ),
      });
    },
  );

  fastify.get(
    "/gas-usage/history",
    {
      schema: {
        description:
          "Get daily gas usage history grouped by function (optionally filtered by on-chain deal ID and function name)",
        querystring: GetGasUsageHistoryQuerySchema,
      },
    },
    async (request, reply) => {
      const { onChainDealId, functionName } = request.query;

      const dailyGasUsage = await getGasUsageHistoryFromDb({
        onChainDealId: onChainDealId ? BigInt(onChainDealId) : undefined,
        functionName,
      });

      return reply.success(dailyGasUsage);
    },
  );

  done();
}
