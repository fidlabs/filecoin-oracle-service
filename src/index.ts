import "dotenv/config";
import cron from "node-cron";
import { SERVICE_CONFIG } from "./config/env";
import "./http-server/server";
import { trackClaimsTerminatedEarlyJob } from "./jobs/datacap/claims-terminated-early-job";
import { dataCapPostingFinishedJob } from "./jobs/datacap/datacap-posting-finished-job";
import { refreshDataCapEvidenceStatusJob } from "./jobs/datacap/datacap-refresh-evidence-status-job";
import { finalizeDealJob } from "./jobs/finalize-deal-job";
import { sectorActivateEvidenceJob } from "./jobs/sector/sector-activate-evidence-job";
import { sectorRefreshEvidenceStatusJob } from "./jobs/sector/sector-refresh-evidence-status-job";
import { setSliOracleJob } from "./jobs/set-sli-job";
import { runSettlementBotJob } from "./jobs/settlement-bot-job";
import { syncDealsJob } from "./jobs/sync-deal-job";
import { syncUrlFinderSliTargetsJob } from "./jobs/sync-url-finder-sli-targets-job";
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
    !SERVICE_CONFIG.TRIGGER_REJECT_EXPIRED_DEAL_INTERVAL_CRON ||
    !SERVICE_CONFIG.TRIGGER_REFRESH_EVIDENCE_STATUS_INTERVAL_CRON ||
    !SERVICE_CONFIG.TRIGGER_DATACAP_POSTING_FINISHED_JOB_INTERVAL_CRON
  ) {
    throw new Error(
      `Missing one or more required cron job intervals in environment variables. Please check the configuration.`,
    );
  }

  const sliInterval = SERVICE_CONFIG.TRIGGER_SLI_JOB_INTERVAL_CRON;
  const datacapPostingFinishedInterval =
    SERVICE_CONFIG.TRIGGER_DATACAP_POSTING_FINISHED_JOB_INTERVAL_CRON;
  const claimsTerminatedEarlyInterval =
    SERVICE_CONFIG.TRIGGER_CLAIMS_TRACKING_JOB_INTERVAL_CRON;
  const settlementBotInterval =
    SERVICE_CONFIG.TRIGGER_SETTLEMENT_BOT_JOB_INTERVAL_CRON;
  const terminateDealsInterval =
    SERVICE_CONFIG.TRIGGER_TERMINATE_DEAL_JOB_INTERVAL_CRON;
  const syncDealsInterval = SERVICE_CONFIG.TRIGGER_SYNC_DEALS_JOB_INTERVAL_CRON;
  const syncUrlFinderSliTargetsInterval =
    SERVICE_CONFIG.TRIGGER_SYNC_URL_FINDER_SLI_TARGETS_JOB_INTERVAL_CRON;
  const rejectExpiredDealInterval =
    SERVICE_CONFIG.TRIGGER_REJECT_EXPIRED_DEAL_INTERVAL_CRON;
  const refreshEvidenceStatusInterval =
    SERVICE_CONFIG.TRIGGER_REFRESH_EVIDENCE_STATUS_INTERVAL_CRON;
  const finalizeInterval =
    SERVICE_CONFIG.TRIGGER_FINALIZE_DEAL_JOB_INTERVAL_CRON;
  const sectorActivateEvidenceInterval =
    SERVICE_CONFIG.TRIGGER_SECTOR_ACTIVATE_EVIDENCE_JOB_INTERVAL_CRON;
  const sectorRefreshEvidenceStatusInterval =
    SERVICE_CONFIG.TRIGGER_SECTOR_REFRESH_EVIDENCE_STATUS_JOB_INTERVAL_CRON;

  childLogger.info(`Scheduling sync deals cron job "${syncDealsInterval}"`);

  childLogger.info(
    `Scheduling Sync URL Finder SLI Targets cron job "${syncUrlFinderSliTargetsInterval}"`,
  );

  childLogger.info(`Scheduling SLI cron job "${sliInterval}"`);
  childLogger.info(
    `Scheduling Datacap Posting Finished cron job "${datacapPostingFinishedInterval}"`,
  );
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
  childLogger.info(
    `Scheduling Refresh Evidence Status cron job "${refreshEvidenceStatusInterval}"`,
  );
  childLogger.info(`Scheduling Finalize Deal cron job "${finalizeInterval}"`);
  childLogger.info(
    `Scheduling Sector Activate Evidence cron job "${sectorActivateEvidenceInterval}"`,
  );
  childLogger.info(
    `Scheduling Sector Refresh Evidence Status cron job "${sectorRefreshEvidenceStatusInterval}"`,
  );

  cron.schedule(refreshEvidenceStatusInterval, refreshDataCapEvidenceStatusJob);
  cron.schedule(syncDealsInterval, syncDealsJob);
  cron.schedule(finalizeInterval, finalizeDealJob);
  cron.schedule(datacapPostingFinishedInterval, dataCapPostingFinishedJob);
  cron.schedule(syncUrlFinderSliTargetsInterval, syncUrlFinderSliTargetsJob);
  cron.schedule(sliInterval, setSliOracleJob);
  cron.schedule(settlementBotInterval, runSettlementBotJob);
  cron.schedule(claimsTerminatedEarlyInterval, trackClaimsTerminatedEarlyJob);
  cron.schedule(sectorActivateEvidenceInterval, sectorActivateEvidenceJob);
  cron.schedule(
    sectorRefreshEvidenceStatusInterval,
    sectorRefreshEvidenceStatusJob,
  );
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
