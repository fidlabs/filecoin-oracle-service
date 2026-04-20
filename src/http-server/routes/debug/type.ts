import { FastifyRequest } from "fastify";

export type DebugJob =
  | "sync-deals"
  | "sync-porep-ids"
  | "track-deal-end-epoch"
  | "sli"
  | "claims"
  | "settlement"
  | "terminated-deals";

export type PostDebugJobRequest = FastifyRequest<{
  Querystring: {
    job: DebugJob;
  };
}>;
