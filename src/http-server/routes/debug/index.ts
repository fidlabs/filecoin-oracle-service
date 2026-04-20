import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { SERVICE_CONFIG } from "../../../config/env";
import { trackClaimsTerminatedEarlyJob } from "../../../jobs/claims-terminated-early-job";
import { trackDealEndEpochJob } from "../../../jobs/set-deal-end-epoch-job";
import { setSliOracleJob } from "../../../jobs/set-sli-job";
import { runSettlementBotJob } from "../../../jobs/settlement-bot-job";
import { syncDealsJob } from "../../../jobs/sync-deal-job";
import { trackTerminateDealJob } from "../../../jobs/terminate-deal-job";
import { AppError } from "../../utils/response-formatter-plugin/types";
import { PostDebugJobRequest } from "./type";

function debugMiddleware(req: FastifyRequest) {
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
      preValidation: async (req: PostDebugJobRequest) => {
        debugMiddleware(req);
      },
    },
    async (req: PostDebugJobRequest, replay: FastifyReply) => {
      switch (req.query.job) {
        case "sync-deals":
          await syncDealsJob();
          break;
        case "track-deal-end-epoch":
          await trackDealEndEpochJob();
          break;
        case "sli":
          await setSliOracleJob();
          break;
        case "claims":
          await trackClaimsTerminatedEarlyJob();
          break;
        case "settlement":
          await runSettlementBotJob();
          break;
        case "terminated-deals":
          await trackTerminateDealJob();
          break;
        default:
          throw new AppError("Invalid job type", "INVALID_JOB_TYPE", 400);
      }

      replay.success({ status: "ok", message: "Job executed successfully" });
    },
  );

  done();
}
