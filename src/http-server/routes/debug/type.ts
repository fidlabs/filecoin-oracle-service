import { FastifyRequest } from "fastify";

export type DebugJob =
  | "sync-deals"
  | "sync-porep-ids"
  | "track-deal-end-epoch"
  | "set-sli"
  | "track-claims"
  | "run-settlement"
  | "track-terminated-deals"
  | "terminate-rail";

export type PostDebugJobRequest = FastifyRequest<{
  Querystring: {
    job: DebugJob;
  };
  Body: {
    dealId?: bigint;
    railId?: bigint;
  };
}>;
