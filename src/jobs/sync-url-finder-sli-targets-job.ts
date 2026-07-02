import {
  getDealsToSyncUrlFinderSliTargetsFromDb,
  markUrlFinderSliTargetTriggeredInDb,
} from "../services/db/db-service";
import { createOrUpdatePoRepDealSliTargetInUrlFinder } from "../services/url-finder-service";
import { baseLogger } from "../utils/logger";

const syncUrlFinderSliTargetsLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Sync URL Finder SLI Targets Job] " },
);

export async function syncUrlFinderSliTargetsJob() {
  try {
    syncUrlFinderSliTargetsLogger.info("Job started");

    const dealsToSyncUrlFinderSliTargets =
      await getDealsToSyncUrlFinderSliTargetsFromDb();

    if (dealsToSyncUrlFinderSliTargets.length === 0) {
      syncUrlFinderSliTargetsLogger.info(
        "No deals found in database that require URL Finder SLI target sync. Job will exit.",
      );
      return;
    }

    syncUrlFinderSliTargetsLogger.info(
      `Found ${dealsToSyncUrlFinderSliTargets.length} deals to sync with URL Finder SLI targets`,
    );

    for (const deal of dealsToSyncUrlFinderSliTargets) {
      try {
        await createOrUpdatePoRepDealSliTargetInUrlFinder(deal);
        await markUrlFinderSliTargetTriggeredInDb(deal.onChainDealId);

        syncUrlFinderSliTargetsLogger.info(
          `Synced URL Finder SLI target for deal ${deal.onChainDealId.toString()}`,
        );
      } catch (error) {
        syncUrlFinderSliTargetsLogger.error(
          { error, dealId: deal.onChainDealId.toString() },
          "Failed to sync URL Finder SLI target for deal",
        );
      }
    }
  } catch (error) {
    syncUrlFinderSliTargetsLogger.error({ error }, "Job failed");
  } finally {
    syncUrlFinderSliTargetsLogger.info("Job finished");
  }
}
