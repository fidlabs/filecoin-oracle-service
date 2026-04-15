import "dotenv/config";
import cron from "node-cron";
import { SERVICE_CONFIG } from "./config/env";
import "./http-server/server";
import { trackClaimsTerminatedEarlyJob } from "./jobs/claims-terminated-early-job";
import { trackDealEndEpochJob } from "./jobs/set-deal-end-epoch-job";
import { setSliOracleJob } from "./jobs/set-sli-job";
import { runSettlementBotJob } from "./jobs/settlement-bot-job";
import { syncDealsJob } from "./jobs/sync-deal-job";
import { trackTerminateDealJob } from "./jobs/terminate-deal-job";
import { baseLogger } from "./utils/logger";

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Main] " },
);

try {
  if (
    !SERVICE_CONFIG.TRIGGER_SLI_JOB_INTERVAL_CRON ||
    !SERVICE_CONFIG.TRIGGER_CLAIMS_TRACKING_JOB_INTERVAL_CRON ||
    !SERVICE_CONFIG.TRIGGER_SETTLEMENT_BOT_JOB_INTERVAL_CRON ||
    !SERVICE_CONFIG.TRIGGER_TERMINATE_DEAL_JOB_INTERVAL_CRON ||
    !SERVICE_CONFIG.TRIGGER_SYNC_DEALS_JOB_INTERVAL_CRON ||
    !SERVICE_CONFIG.TRIGGER_END_EPOCH_DEAL_JOB_INTERVAL_CRON
  ) {
    throw new Error(
      `Missing one or more required cron job intervals in environment variables. Please check the configuration.`,
    );
  }

  const sliInterval = SERVICE_CONFIG.TRIGGER_SLI_JOB_INTERVAL_CRON;
  const claimsTerminatedEarlyInterval =
    SERVICE_CONFIG.TRIGGER_CLAIMS_TRACKING_JOB_INTERVAL_CRON;
  const settlementBotInterval =
    SERVICE_CONFIG.TRIGGER_SETTLEMENT_BOT_JOB_INTERVAL_CRON;
  const terminateDealsInterval =
    SERVICE_CONFIG.TRIGGER_TERMINATE_DEAL_JOB_INTERVAL_CRON;
  const syncDealsInterval = SERVICE_CONFIG.TRIGGER_SYNC_DEALS_JOB_INTERVAL_CRON;
  const trackDealEndEpochInterval =
    SERVICE_CONFIG.TRIGGER_END_EPOCH_DEAL_JOB_INTERVAL_CRON;

  childLogger.info(`Scheduling sync deals cron job "${syncDealsInterval}"`);
  childLogger.info(
    `Scheduling Track Deal End Epoch cron job "${trackDealEndEpochInterval}"`,
  );
  childLogger.info(`Scheduling SLI cron job "${sliInterval}"`);
  childLogger.info(
    `Scheduling Terminations claims cron job "${claimsTerminatedEarlyInterval}"`,
  );
  childLogger.info(
    `Scheduling Settlement Bot cron job "${settlementBotInterval}"`,
  );
  childLogger.info(
    `Scheduling Terminate Deals cron job "${terminateDealsInterval}"`,
  );

  cron.schedule(syncDealsInterval, syncDealsJob);
  cron.schedule(sliInterval, setSliOracleJob);
  cron.schedule(trackDealEndEpochInterval, trackDealEndEpochJob);
  cron.schedule(claimsTerminatedEarlyInterval, trackClaimsTerminatedEarlyJob);
  cron.schedule(settlementBotInterval, runSettlementBotJob);
  cron.schedule(terminateDealsInterval, trackTerminateDealJob);
} catch (err: unknown) {
  if (err instanceof Error) {
    const message = err instanceof Error ? err.message : String(err);

    childLogger.error(`Fatal startup error: ${message}`);
  } else {
    childLogger.error(`Fatal startup error: ${err}`);
  }
  process.exit(1);
}
