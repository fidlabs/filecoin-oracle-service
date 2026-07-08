import { FastifyRequest } from "fastify";

export type DebugJob =
  | "sync-deals"
  | "sync-url-finder-sli-targets"
  | "sync-porep-ids"
  | "activate-payment"
  | "datacap-posting-finished"
  | "set-sli"
  | "track-terminated-claims"
  | "run-settlement"
  | "sync-settlement-history"
  | "refresh-evidence-status"
  | "track-terminated-deals"
  | "reject-expired-deal";

export type PostDebugJobRequest = FastifyRequest<{
  Querystring: {
    job: DebugJob;
  };
}>;
