import express, { Request, Response, NextFunction } from "express";

// import { setSliOracleJob } from "../jobs/set-sli-job.js";
import { logger } from "../utils/logger.js";
import { SERVICE_CONFIG } from "../config/env.js";

const app = express();

const port = SERVICE_CONFIG.APP_PORT || 3000;
const AUTH_TOKEN = SERVICE_CONFIG.JOB_TRIGGER_AUTH_TOKEN;

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];

  if (!AUTH_TOKEN) {
    logger.warn("Missing JOB_TRIGGER_TOKEN env variable — skipping auth");
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
  "/trigger-now",
  authMiddleware,
  async (req: Request, res: Response) => {
    logger.info("Manual trigger received via /trigger-now");

    try {
      // await setSliOracleJob();
      res.json({ status: "ok", message: "Job triggered successfully" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Manual job trigger failed: ${message}`);
      res.status(500).json({ error: message });
    }
  },
);

app.listen(port, () => {
  logger.info(`Health/trigger server running on port ${port}`);
  logger.info(`Health endpoint: GET /health`);
  logger.info(`Manual trigger:  POST /trigger-now`);
});
