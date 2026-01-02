import express, { NextFunction, Request, Response } from "express";
import { SERVICE_CONFIG } from "../config/env.js";
import { trackClaimsJob } from "../jobs/claims-tracking-job.js";
import { setSliOracleJob } from "../jobs/set-sli-job.js";
import { baseLogger } from "../utils/logger.js";

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
  "/trigger-sli-job",
  authMiddleware,
  async (req: Request, res: Response) => {
    httpLogger.info("Manual trigger received via /trigger-now");

    try {
      await setSliOracleJob();

      res.json({ status: "ok", message: "Job triggered successfully" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      httpLogger.error(`Manual job trigger failed: ${message}`);
      res.status(500).json({ error: message });
    }
  },
);

app.post(
  "/trigger-claims-job",
  authMiddleware,
  async (req: Request, res: Response) => {
    httpLogger.info("Manual trigger received via /trigger-claims-job");

    try {
      await trackClaimsJob();

      res.json({ status: "ok", message: "Job triggered successfully" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      httpLogger.error(`Manual job trigger failed: ${message}`);
      res.status(500).json({ error: message });
    }
  },
);

app.listen(port, () => {
  httpLogger.info("Oracle service started on port " + port);
  httpLogger.info(`Health endpoint: GET /health`);
  httpLogger.info(`Manual SLI JOB trigger:  POST /trigger-sli-job`);
  httpLogger.info(`Manual CLAIMS JOB trigger:  POST /trigger-claims-job`);
});
