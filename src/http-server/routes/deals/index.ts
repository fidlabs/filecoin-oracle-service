import { FastifyPluginOptions } from "fastify";
import {
  getCountOfCompletedDealsFromDb,
  getDealByOnChainIdFromDb,
  getDealsByStateFromDb,
  getProviderScoreByOnChainDealIdFromDb,
} from "../../../services/db-service";
import { DealState } from "../../../utils/types";
import { FastifyTypedInstance } from "../../server";
import { normalizePagination } from "../../utils/pagination";
import {
  GetDealByIdRequestSchema,
  GetFilteredDealsQuerySchema,
} from "./schema";

export function dealRoutes(
  fastify: FastifyTypedInstance,
  options: FastifyPluginOptions,
  done: (err?: Error) => void,
) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = routeOptions.schema || {};
    routeOptions.schema.tags = routeOptions.schema.tags || ["Deals"];
  });

  fastify.get(
    "/total-done",
    {
      schema: {
        description: "Get the total number of completed deals",
      },
    },
    async (_, replay) => {
      const totalCompletedDeals = await getCountOfCompletedDealsFromDb();

      return replay.success({ totalCompletedDeals });
    },
  );

  fastify.get(
    "/",
    {
      schema: {
        description:
          "Get a paginated list of deals, optionally filtered by state. Supported states: Proposed, Accepted, Completed, Rejected, Terminated.",
        querystring: GetFilteredDealsQuerySchema,
      },
    },
    async (request, reply) => {
      const { state } = request.query;

      const pagination = normalizePagination(request.query);

      const { filteredDeals, totalDeals } = await getDealsByStateFromDb({
        state: state as DealState,
        page: pagination.page,
        limit: pagination.limit,
      });

      return reply.success({
        items: filteredDeals,
        total: totalDeals,
        page: pagination.page,
        limit: pagination.limit,
      });
    },
  );

  fastify.get(
    "/:onChainDealId",
    {
      preParsing: async (request) => {
        const { onChainDealId } = request.params as {
          onChainDealId: string;
        };

        if (!/^\d+$/.test(onChainDealId)) {
          throw new Error("Invalid onChainDealId format");
        }
      },
      schema: {
        description: "Get deal details by on-chain deal ID",
        params: GetDealByIdRequestSchema,
      },
    },
    async (request, reply) => {
      const { onChainDealId } = request.params;

      const deal = await getDealByOnChainIdFromDb(BigInt(onChainDealId));

      return reply.success(deal);
    },
  );

  fastify.get(
    "/:onChainDealId/provider-score",
    {
      preParsing: async (request) => {
        const { onChainDealId } = request.params as {
          onChainDealId: string;
        };

        if (!/^\d+$/.test(onChainDealId)) {
          throw new Error("Invalid onChainDealId format");
        }
      },
      schema: {
        description: "Get deal details by on-chain deal ID",
        params: GetDealByIdRequestSchema,
      },
    },
    async (request, reply) => {
      const { onChainDealId } = request.params;

      const provider_score = await getProviderScoreByOnChainDealIdFromDb(
        BigInt(onChainDealId),
      );

      return reply.success(provider_score);
    },
  );

  done();
}
