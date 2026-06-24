import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { SERVICE_CONFIG } from "../../../config/env";
import { trackClaimsTerminatedEarlyJob } from "../../../jobs/claims-terminated-early-job";
import { runRejectExpiredDealJob } from "../../../jobs/reject-expired-deal-job";
import { trackDealEndEpochJob } from "../../../jobs/set-deal-end-epoch-job";
import { setSliOracleJob } from "../../../jobs/set-sli-job";
import { runSettlementBotJob } from "../../../jobs/settlement-bot-job";
import { syncUrlFinderSliTargetsJob } from "../../../jobs/sync-url-finder-sli-targets-job";
import { syncDealsJob } from "../../../jobs/sync-deal-job";
import { syncSettlementHistoryJob } from "../../../jobs/sync-settlement-history-job";
import { trackTerminateDealJob } from "../../../jobs/terminate-deal-job";
import { httpLogger } from "../../server";
import { AppError } from "../../utils/response-formatter-plugin/types";
import { PostDebugJobRequest } from "./type";

export function apiAuthMiddleware(req: FastifyRequest) {
  const authHeader = req.headers["authorization"];

  const AUTH_TOKEN = SERVICE_CONFIG.JOB_TRIGGER_AUTH_TOKEN;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const token = authHeader.split(" ")[1];

  if (token !== AUTH_TOKEN) {
    throw new AppError("Forbidden", "FORBIDDEN", 403);
  }
}

export function debugRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
  done: (err?: Error) => void,
) {
  fastify.post(
    "/trigger-job",
    {
      schema: {
        hide: true,
      },
      preValidation: async (req: PostDebugJobRequest) => {
        apiAuthMiddleware(req);
      },
    },
    async (req: PostDebugJobRequest, replay: FastifyReply) => {
      httpLogger.info(`Received request to trigger job: ${req.query.job}`);

      switch (req.query.job) {
        case "sync-deals":
          await syncDealsJob();
          break;
        case "sync-url-finder-sli-targets":
          await syncUrlFinderSliTargetsJob();
          break;
        case "track-deal-end-epoch":
          await trackDealEndEpochJob();
          break;
        case "set-sli":
          await setSliOracleJob();
          break;
        case "track-terminated-claims":
          await trackClaimsTerminatedEarlyJob();
          break;
        case "run-settlement":
          await runSettlementBotJob();
          break;
        case "sync-settlement-history":
          await syncSettlementHistoryJob();
          break;
        case "track-terminated-deals":
          await trackTerminateDealJob();
          break;
        case "reject-expired-deal":
          await runRejectExpiredDealJob();
          break;
        default:
          throw new AppError("Invalid job type", "INVALID_JOB_TYPE", 400);
      }

      replay.success({ status: "ok", message: "Job executed successfully" });
    },
  );

  done();
}
