import cron from "node-cron";
import { SERVICE_CONFIG } from "./config/env.js";
import { setSliOracleJob } from "./jobs/set-sli-job.js";
import { logger } from "./utils/logger.js";

try {
  const intervalHours = parseInt(SERVICE_CONFIG.TRIGGER_INTERVAL_HOURS);

  if (isNaN(intervalHours) || intervalHours <= 0) {
    throw new Error(
      `Invalid TRIGGER_INTERVAL_HOURS: ${SERVICE_CONFIG.TRIGGER_INTERVAL_HOURS}`
    );
  }

  const cronExpr = `0 * /${intervalHours} * * *`;

  logger.info(
    `Scheduling job every ${SERVICE_CONFIG.TRIGGER_INTERVAL_HOURS}h: "${cronExpr}"`
  );

  cron.schedule(cronExpr, setSliOracleJob);

  // setSliOracleJob(); // TODO: remove this line if not needed on startup
} catch (err: any) {
  logger.error("Fatal startup error:", err.message);
  process.exit(1);
}
