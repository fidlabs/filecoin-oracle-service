import express, { NextFunction, Request, Response } from "express";
import { SERVICE_CONFIG } from "../config/env";
import { trackClaimsTerminatedEarlyJob } from "../jobs/claims-terminated-early-job";
import { trackDealEndEpochJob } from "../jobs/set-deal-end-epoch-job";
import { setSliOracleJob } from "../jobs/set-sli-job";
import { runSettlementBotJob } from "../jobs/settlement-bot-job";
import { syncDealsJob } from "../jobs/sync-deal-job";
import { trackTerminateDealJob } from "../jobs/terminate-deal-job";
import {
  getCountOfCompletedDealsFromDb,
  getDealByOnChainIdFromDb,
  getDealsByStateFromDb,
} from "../services/db-service";
import { baseLogger } from "../utils/logger";
import { DealState } from "../utils/types";
import { ApiResponse, PorepMarketDealResponse } from "./request-types";

const app = express();

const port = SERVICE_CONFIG.APP_PORT || 3000;
const AUTH_TOKEN = SERVICE_CONFIG.JOB_TRIGGER_AUTH_TOKEN;

const httpLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[HTTP] " },
);

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];

  if (!AUTH_TOKEN) {
    httpLogger.warn("Missing JOB_TRIGGER_TOKEN env variable — skipping auth");
    return next();
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ error: "Forbidden" });
  }

  next();
}

app.post(
  "/trigger-job",
  authMiddleware,
  async (req: Request, res: Response) => {
    httpLogger.info(
      "Manual trigger received via /trigger-job endpoint with query: " +
        JSON.stringify(req.query),
    );

    try {
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
          return res.status(400).json({
            error:
              "Invalid job type. Please specify a valid job type in the query parameter, e.g. ?job=sli, ?job=claims, ?job=settlement, ?job=terminated-deals, ?job=sync-deals or ?job=track-deal-end-epoch",
          });
      }

      res.json({ status: "ok", message: "Job executed successfully" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      httpLogger.error(`Manual job trigger failed: ${message}`);
      res.status(500).json({ error: message });
    }
  },
);

app.get("/total-deals-done", async (req: Request, res: Response) => {
  try {
    const totalCompletedDeals = await getCountOfCompletedDealsFromDb();
    res.json({ totalCompletedDeals });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    httpLogger.error(`Manual job trigger failed: ${message}`);
    res.status(500).json({ error: message });
  }
});

app.get(
  "/deals",
  async (
    req: Request,
    res: Response<ApiResponse<PorepMarketDealResponse[]>>,
  ) => {
    const { state, page = 1, limit = 10 } = req.query;

    try {
      const deals: PorepMarketDealResponse[] = await getDealsByStateFromDb({
        state: state as DealState,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.status(200).json({ data: deals, success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      httpLogger.error(`Failed to fetch deals: ${message}`);
      res.status(500).json({
        data: [],
        success: false,
        error: message,
      });
    }
  },
);

app.get(
  "/deal/:id",
  async (
    req: Request,
    res: Response<ApiResponse<PorepMarketDealResponse | null>>,
  ) => {
    const { id } = req.params;

    try {
      const deal: PorepMarketDealResponse | null =
        await getDealByOnChainIdFromDb(BigInt(id));

      res.status(200).json({ data: deal, success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      httpLogger.error(`Failed to fetch deals: ${message}`);
      res.status(500).json({
        data: null,
        success: false,
        error: message,
      });
    }
  },
);

app.listen(port, () => {
  httpLogger.info("Oracle service started on port " + port);
  httpLogger.info(`Health endpoint: GET /health`);
  httpLogger.info(
    `Manual job trigger endpoint: POST /trigger-job?job=<job-name>`,
  );
});
