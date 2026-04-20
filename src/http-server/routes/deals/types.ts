import { FastifyRequest } from "fastify";
import { DealState } from "../../../utils/types";
import { PaginationQuery } from "../../utils/pagination";

interface GetFilteredDeals extends PaginationQuery {
  state?: DealState;
}

export type GetFilteredDealsRequest = FastifyRequest<{
  Querystring: GetFilteredDeals;
}>;

export type GetDealByIdRequest = FastifyRequest<{
  Params: {
    id: string;
  };
}>;
