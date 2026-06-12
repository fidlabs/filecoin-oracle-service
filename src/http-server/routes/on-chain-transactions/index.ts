import { FastifyPluginOptions } from "fastify";
import { getTotalGasUsageGroupedByFunctionFromDb } from "../../../services/db/db-service";
import { FastifyTypedInstance } from "../../server";
import { GetByIdDealIdQuerySchema } from "../deals/schema";

export function onChainTransactionsRoutes(
  fastify: FastifyTypedInstance,
  options: FastifyPluginOptions,
  done: (err?: Error) => void,
) {
  fastify.get(
    "/gas-usage",
    {
      schema: {
        description: "Get deal details by on-chain deal ID",
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

  done();
}
