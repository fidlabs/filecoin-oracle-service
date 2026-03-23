import "dotenv/config";
import { SERVICE_CONFIG } from "./config/env";
import "./http-server/server";
import { baseLogger } from "./utils/logger";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Main] " },
);

try {
  if (
    !SERVICE_CONFIG.TRIGGER_SLI_JOB_INTERVAL_CRON ||
    !SERVICE_CONFIG.TRIGGER_CLAIMS_TRACKING_JOB_INTERVAL_CRON ||
    !SERVICE_CONFIG.TRIGGER_SETTLEMENT_BOT_JOB_INTERVAL_CRON ||
    !SERVICE_CONFIG.TRIGGER_TERMINATE_DEAL_JOB_INTERVAL_CRON
  ) {
    throw new Error(
      `Missing TRIGGER_SLI_JOB_INTERVAL_CRON, TRIGGER_CLAIMS_TRACKING_JOB_INTERVAL_CRON, TRIGGER_SETTLEMENT_BOT_JOB_INTERVAL_CRON in environment variables`,
    );
  }

  const sliInterval = SERVICE_CONFIG.TRIGGER_SLI_JOB_INTERVAL_CRON;
  const claimsInterval =
    SERVICE_CONFIG.TRIGGER_CLAIMS_TRACKING_JOB_INTERVAL_CRON;
  const settlementBotInterval =
    SERVICE_CONFIG.TRIGGER_SETTLEMENT_BOT_JOB_INTERVAL_CRON;
  const terminateDealsInterval =
    SERVICE_CONFIG.TRIGGER_TERMINATE_DEAL_JOB_INTERVAL_CRON;

  childLogger.info(`Scheduling SLI cron job "${sliInterval}"`);
  childLogger.info(
    `Scheduling Terminations claims cron job "${claimsInterval}"`,
  );
  childLogger.info(
    `Scheduling Settlement Bot cron job "${settlementBotInterval}"`,
  );
  childLogger.info(
    `Scheduling Terminate Deals cron job "${terminateDealsInterval}"`,
  );

  // cron.schedule(sliInterval, setSliOracleJob);
  // cron.schedule(claimsInterval, trackClaimsTerminatedEarlyJob);
  // cron.schedule(settlementBotInterval, runSettlementBotJob);
  // cron.schedule("terminateDealsInterval", trackTerminateDealJob);
} catch (err: unknown) {
  if (err instanceof Error) {
    const message = err instanceof Error ? err.message : String(err);

    childLogger.error(`Fatal startup error: ${message}`);
  } else {
    childLogger.error(`Fatal startup error: ${err}`);
  }
  process.exit(1);
}
