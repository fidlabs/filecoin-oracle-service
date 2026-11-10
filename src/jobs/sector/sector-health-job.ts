import {
  SectorHealthCheckType,
  SectorHealthCheckState,
  SectorHealthCheckResult,
  SectorHealthCheckStopReason,
  SectorStatus,
} from "../../../prisma/generated/client";
import { SERVICE_CONFIG } from "../../config/env";
import {
  createSectorHealthCheck,
  getSectorAdaptersToCheckHealthFromDb,
  SectorHealthAdapter,
  SectorHealthSector,
  storeSectorHealthObservation,
  updateSectorHealthCheck,
} from "../../services/db/sector-health.db";
import {
  getSectorHealthSnapshot,
  readSectorHealth,
} from "../../services/sector-health-service";
import { baseLogger } from "../../utils/logger";

const logger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Sector Health Job] " },
);
let running = false;

export function orderSectorsForHealthCheck(
  sectors: SectorHealthSector[],
  type: SectorHealthCheckType,
) {
  const priority = (sector: SectorHealthSector) => {
    const status = sector.health?.lastKnownStatus;
    if (status === SectorStatus.Faulty || status === SectorStatus.Dead)
      return 0;
    if (status == null || sector.health?.lastError) return 1;
    return 2;
  };

  return [...sectors].sort((a, b) => {
    if (type === SectorHealthCheckType.Daily && priority(a) !== priority(b))
      return priority(a) - priority(b);
    return a.sectorIndex < b.sectorIndex
      ? -1
      : a.sectorIndex > b.sectorIndex
        ? 1
        : 0;
  });
}

async function checkAdapterHealth(
  adapter: SectorHealthAdapter,
  attempts: number,
) {
  const initialized =
    adapter.healthChecks.some(
      (check) => check.totalSectors === adapter.sectors.length,
    ) &&
    adapter.sectors.every((sector) => sector.health?.lastKnownStatus != null);

  const type = initialized
    ? SectorHealthCheckType.Daily
    : SectorHealthCheckType.Initialization;
  const check = await createSectorHealthCheck(
    adapter.id,
    type,
    adapter.sectors.length,
  );

  try {
    const receipt = adapter.receipt;
    // Never report Healthy from an empty or partially synchronized inventory.
    if (
      !receipt ||
      adapter.sectors.length === 0 ||
      receipt.sectorCount !== BigInt(adapter.sectors.length) ||
      adapter.sectors.some(
        (sector, index) => sector.sectorIndex !== BigInt(index),
      )
    ) {
      throw new Error(
        "Sector inventory is empty or incomplete; waiting for deal synchronization",
      );
    }
    const snapshot = await getSectorHealthSnapshot();
    await updateSectorHealthCheck(check.id, {
      observationEpoch: BigInt(snapshot.Height),
    });
    let failures = 0;
    let triggerSectorId: string | null = null;
    for (const sector of orderSectorsForHealthCheck(adapter.sectors, type)) {
      let status: SectorStatus | null = null;
      let errorMessage: string | null = null;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          status = await readSectorHealth(
            adapter.onChainDealId,
            receipt.providerActorId,
            sector.sectorNumber,
            snapshot,
          );
          errorMessage = null;
          break;
        } catch (error) {
          errorMessage = error instanceof Error ? error.message : String(error);
          if (attempt < attempts)
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
      await storeSectorHealthObservation({
        checkId: check.id,
        sectorId: sector.id,
        epoch: BigInt(snapshot.Height),
        status,
        error: errorMessage,
      });
      if (status === null) {
        failures++;
        logger.warn(
          { sectorId: sector.id, error: errorMessage },
          "Sector status unavailable",
        );
      } else if (status !== SectorStatus.Active) {
        triggerSectorId ??= sector.id;
        if (type === SectorHealthCheckType.Daily) break;
      }
    }
    await updateSectorHealthCheck(check.id, {
      state: SectorHealthCheckState.Completed,
      finishedAt: new Date(),
      result: triggerSectorId
        ? SectorHealthCheckResult.Unhealthy
        : failures
          ? SectorHealthCheckResult.Unknown
          : SectorHealthCheckResult.Healthy,
      stopReason:
        triggerSectorId && type === SectorHealthCheckType.Daily
          ? SectorHealthCheckStopReason.NonActiveFound
          : SectorHealthCheckStopReason.Completed,
      ...(triggerSectorId
        ? {
            triggerSectorHealth: {
              connect: { sectorAdapterSectorId: triggerSectorId },
            },
          }
        : {}),
    });
    logger.info(
      { onChainDealId: adapter.onChainDealId, type, failures, triggerSectorId },
      "Health check completed",
    );
  } catch (error) {
    await updateSectorHealthCheck(check.id, {
      state: SectorHealthCheckState.Failed,
      result: SectorHealthCheckResult.Unknown,
      stopReason: SectorHealthCheckStopReason.Error,
      finishedAt: new Date(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function sectorHealthJob() {
  if (running) {
    logger.info("Job already running, skipping overlapping invocation");
    return;
  }

  running = true;

  try {
    logger.info("Job started");
    const attempts = SERVICE_CONFIG.SECTOR_HEALTH_MAX_ATTEMPTS;

    const adapters = await getSectorAdaptersToCheckHealthFromDb();

    for (const adapter of adapters) {
      try {
        await checkAdapterHealth(adapter, attempts);
      } catch (error) {
        logger.error(
          { error, onChainDealId: adapter.onChainDealId },
          "Health check failed",
        );
      }
    }
  } catch (error) {
    logger.error({ error }, "Job failed");
    throw error;
  } finally {
    running = false;
    logger.info("Job finished");
  }
}
