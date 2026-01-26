import cron from "node-cron";
import { SERVICE_CONFIG } from "./config/env.js";
import "./http-server/server.js";
import { trackClaimsJob } from "./jobs/claims-tracking-job.js";
import { setSliOracleJob } from "./jobs/set-sli-job.js";
import { baseLogger } from "./utils/logger.js";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Main] " },
);

try {
  if (
    !SERVICE_CONFIG.TRIGGER_SLI_JOB_INTERVAL_CRON ||
    !SERVICE_CONFIG.TRIGGER_CLAIMS_TRACKING_JOB_INTERVAL_CRON
  ) {
    throw new Error(
      "Missing TRIGGER_SLI_JOB_INTERVAL_CRON or TRIGGER_CLAIMS_TRACKING_JOB_INTERVAL_CRON in environment variables",
    );
  }

  const sliInterval = SERVICE_CONFIG.TRIGGER_SLI_JOB_INTERVAL_CRON;
  const claimsInterval =
    SERVICE_CONFIG.TRIGGER_CLAIMS_TRACKING_JOB_INTERVAL_CRON;

  childLogger.info(`Scheduling SLI cron job "${sliInterval}"`);
  childLogger.info(
    `Scheduling Terminations claims cron job "${claimsInterval}"`,
  );

  cron.schedule(sliInterval, setSliOracleJob);
  cron.schedule(claimsInterval, trackClaimsJob);
} catch (err: unknown) {
  if (err instanceof Error) {
    const message = err instanceof Error ? err.message : String(err);

    childLogger.error(`Fatal startup error: ${message}`);
  } else {
    childLogger.error(`Fatal startup error: ${err}`);
  }
  process.exit(1);
}
