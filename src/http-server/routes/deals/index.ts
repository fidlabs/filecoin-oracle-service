import { FastifyInstance, FastifyPluginOptions, FastifyReply } from "fastify";
import {
  getCountOfCompletedDealsFromDb,
  getDealByOnChainIdFromDb,
  getDealsByStateFromDb,
} from "../../../services/db-service";
import { DealState } from "../../../utils/types";
import { normalizePagination } from "../../utils/pagination";
import { RouteWithResponse } from "../../utils/response-formatter-plugin/types";
import { GetDealByIdRequest, GetFilteredDealsRequest } from "./types";

export function dealRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
  done: (err?: Error) => void,
) {
  fastify.get<RouteWithResponse<number>>("/total-done", async (_, replay) => {
    const totalCompletedDeals = await getCountOfCompletedDealsFromDb();

    return replay.success(totalCompletedDeals);
  });

  fastify.get(
    "/",
    async (request: GetFilteredDealsRequest, reply: FastifyReply) => {
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
    "/:id",
    async (request: GetDealByIdRequest, reply: FastifyReply) => {
      const { id } = request.params;

      const deal = await getDealByOnChainIdFromDb(BigInt(id));

      return reply.success(deal);
    },
  );

  done();
}
