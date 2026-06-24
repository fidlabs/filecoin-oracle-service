import { FastifyRequest } from "fastify";

export type DebugJob =
  | "sync-deals"
  | "sync-url-finder-sli-targets"
  | "sync-porep-ids"
  | "track-deal-end-epoch"
  | "set-sli"
  | "track-terminated-claims"
  | "run-settlement"
  | "sync-settlement-history"
  | "track-terminated-deals"
  | "reject-expired-deal";

export type PostDebugJobRequest = FastifyRequest<{
  Querystring: {
    job: DebugJob;
  };
}>;
