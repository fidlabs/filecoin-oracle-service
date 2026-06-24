import "dotenv/config";
import { SERVICE_CONFIG } from "./config/env";
import "./http-server/server";
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
    !SERVICE_CONFIG.TRIGGER_END_EPOCH_DEAL_JOB_INTERVAL_CRON ||
    !SERVICE_CONFIG.TRIGGER_REJECT_EXPIRED_DEAL_INTERVAL_CRON
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
  const syncUrlFinderSliTargetsInterval =
    SERVICE_CONFIG.SYNC_URL_FINDER_SLI_TARGETS_JOB_INTERVAL_CRON;
  const trackDealEndEpochInterval =
    SERVICE_CONFIG.TRIGGER_END_EPOCH_DEAL_JOB_INTERVAL_CRON;
  const rejectExpiredDealInterval =
    SERVICE_CONFIG.TRIGGER_REJECT_EXPIRED_DEAL_INTERVAL_CRON;

  childLogger.info(`Scheduling sync deals cron job "${syncDealsInterval}"`);

  childLogger.info(
    `Scheduling Sync URL Finder SLI Targets cron job "${syncUrlFinderSliTargetsInterval}"`,
  );

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
  childLogger.info(
    `Scheduling Reject Expired Deal cron job "${rejectExpiredDealInterval}"`,
  );

  // cron.schedule(rejectExpiredDealInterval, runRejectExpiredDealJob);
  // cron.schedule(syncDealsInterval, syncDealsJob);
  // cron.schedule(syncUrlFinderSliTargetsInterval, syncUrlFinderSliTargetsJob);
  // cron.schedule(sliInterval, setSliOracleJob);
  // cron.schedule(trackDealEndEpochInterval, trackDealEndEpochJob);
  // cron.schedule(settlementBotInterval, runSettlementBotJob);

  //cron.schedule(claimsTerminatedEarlyInterval, trackClaimsTerminatedEarlyJob);
  //cron.schedule(terminateDealsInterval, trackTerminateDealJob);
} catch (err: unknown) {
  if (err instanceof Error) {
    const message = err instanceof Error ? err.message : String(err);

    childLogger.error(`Fatal startup error: ${message}`);
  } else {
    childLogger.error(`Fatal startup error: ${err}`);
  }
  process.exit(1);
}
