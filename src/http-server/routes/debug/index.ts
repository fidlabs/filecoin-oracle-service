import { createHash, timingSafeEqual } from "node:crypto";
import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { sectorHealthJob } from "../../../jobs/sector/sector-health-job";
import { SERVICE_CONFIG } from "../../../config/env";
import { trackClaimsTerminatedEarlyJob } from "../../../jobs/datacap/claims-terminated-early-job";
import { dataCapPostingFinishedJob } from "../../../jobs/datacap/datacap-posting-finished-job";
import { refreshDataCapEvidenceStatusJob } from "../../../jobs/datacap/datacap-refresh-evidence-status-job";
import { sectorActivateEvidenceJob } from "../../../jobs/sector/sector-activate-evidence-job";
import { sectorRefreshEvidenceStatusJob } from "../../../jobs/sector/sector-refresh-evidence-status-job";
import { setSliOracleJob } from "../../../jobs/set-sli-job";
import { runSettlementBotJob } from "../../../jobs/settlement-bot-job";
import { syncDealsJob } from "../../../jobs/sync-deal-job";
import { syncSettlementHistoryJob } from "../../../jobs/sync-settlement-history-job";
import { syncUrlFinderSliTargetsJob } from "../../../jobs/sync-url-finder-sli-targets-job";
import { trackTerminateDealJob } from "../../../jobs/terminate-deal-job";
import { AppError } from "../../utils/response-formatter-plugin/types";
import { PostDebugJobRequest } from "./type";

const MIN_AUTH_TOKEN_LENGTH = 32;

const sha256 = (value: string) => createHash("sha256").update(value).digest();

export function apiAuthMiddleware(req: FastifyRequest) {
  const AUTH_TOKEN = SERVICE_CONFIG.JOB_TRIGGER_AUTH_TOKEN;

  if (AUTH_TOKEN.length < MIN_AUTH_TOKEN_LENGTH) {
    throw new AppError(
      "Job trigger endpoint is disabled",
      "JOB_TRIGGER_DISABLED",
      503,
    );
  }

  const match = /^Bearer (\S+)$/.exec(req.headers["authorization"] ?? "");

  if (!match) {
    throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
  }

  // Compare hashes so both buffers have equal length for timingSafeEqual.
  if (!timingSafeEqual(sha256(match[1]), sha256(AUTH_TOKEN))) {
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
      req.log.info({ job: req.query.job }, "Received request to trigger job");

      try {
        switch (req.query.job) {
          case "sync-deals":
            await syncDealsJob();
            break;
          case "sync-url-finder-sli-targets":
            await syncUrlFinderSliTargetsJob();
            break;
          case "datacap-posting-finished":
            await dataCapPostingFinishedJob();
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
          case "refresh-datacap-evidence-status":
            await refreshDataCapEvidenceStatusJob();
            break;
          case "refresh-sector-evidence-status":
            await sectorRefreshEvidenceStatusJob();
            break;
          case "check-sector-health":
            await sectorHealthJob();
            break;
          case "activate-sector-evidence":
            await sectorActivateEvidenceJob();
            break;
          case "track-terminated-deals":
            await trackTerminateDealJob();
            break;
          default:
            throw new AppError("Invalid job type", "INVALID_JOB_TYPE", 400);
        }
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        req.log.error(
          { err: error, job: req.query.job },
          "Triggered job failed",
        );

        throw new AppError(
          `Job '${req.query.job}' execution failed`,
          "JOB_EXECUTION_FAILED",
          500,
        );
      }

      replay.success({ status: "ok", message: "Job executed successfully" });
    },
  );

  done();
}
