import cron from "node-cron";
import { SERVICE_CONFIG } from "./config/env.js";
import "./http-server/server.js";
import { setSliOracleJob } from "./jobs/set-sli-job.js";
import { baseLogger } from "./utils/logger.js";
import { trackClaimsJob } from "./jobs/claims-tracking-job.js";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Main] " },
);

try {
  const intervalHours = parseInt(SERVICE_CONFIG.TRIGGER_INTERVAL_HOURS);

  if (isNaN(intervalHours) || intervalHours <= 0) {
    throw new Error(
      `Invalid TRIGGER_INTERVAL_HOURS: ${SERVICE_CONFIG.TRIGGER_INTERVAL_HOURS}`,
    );
  }

  // let cronExpr = `0 */${intervalHours} * * *`;

  // if (intervalHours === 1) {
  //   cronExpr = `0 * * * *`;
  // }

  const cronExpr = "* * * * *"; // every minute for testing purposes

  childLogger.info(
    `Scheduling SLI job every ${SERVICE_CONFIG.TRIGGER_INTERVAL_HOURS}h: "${cronExpr}"`,
  );

  childLogger.info(
    `Scheduling Terminations claims job every ${SERVICE_CONFIG.TRIGGER_INTERVAL_HOURS}h: "${cronExpr}"`,
  );

  cron.schedule(cronExpr, setSliOracleJob);
  cron.schedule(cronExpr, trackClaimsJob);
} catch (err: unknown) {
  if (err instanceof Error) {
    const message = err instanceof Error ? err.message : String(err);

    childLogger.error(`Fatal startup error: ${message}`);
  } else {
    childLogger.error(`Fatal startup error: ${err}`);
  }
  process.exit(1);
}
