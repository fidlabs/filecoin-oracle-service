import {
  Prisma,
  DealState,
  EvidenceAdapterType,
  SectorHealthCheckState,
  SectorHealthCheckStopReason,
  SectorStatus,
  SectorHealthCheckType,
} from "../../../prisma/generated/client";
import { prismaClient } from "./db-client";

export async function getSectorAdaptersToCheckHealthFromDb() {
  return prismaClient.sector_adapter.findMany({
    where: {
      deal: {
        state: DealState.Active,
        evidenceAdapterType: EvidenceAdapterType.Sector,
        isRailTerminated: false,
      },
      receipt: { is: { activated: true } },
    },
    include: {
      receipt: true,
      sectors: {
        include: { health: true },
        orderBy: { sectorIndex: Prisma.SortOrder.asc },
      },
      healthChecks: {
        where: {
          type: SectorHealthCheckType.Initialization,
          state: SectorHealthCheckState.Completed,
          failedSectors: 0,
          stopReason: SectorHealthCheckStopReason.Completed,
        },
        orderBy: { finishedAt: Prisma.SortOrder.desc },
        take: 1,
      },
    },
  });
}

export type SectorHealthAdapter = Awaited<
  ReturnType<typeof getSectorAdaptersToCheckHealthFromDb>
>[number];
export type SectorHealthSector = SectorHealthAdapter["sectors"][number];

export async function createSectorHealthCheck(
  adapterId: string,
  type: SectorHealthCheckType,
  totalSectors: number,
) {
  return prismaClient.sector_adapter_health_check.create({
    data: { sectorAdapterId: adapterId, type, totalSectors },
  });
}

export async function updateSectorHealthCheck(
  id: string,
  data: Prisma.sector_adapter_health_checkUpdateInput,
) {
  return prismaClient.sector_adapter_health_check.update({
    where: { id },
    data,
  });
}

export async function storeSectorHealthObservation(input: {
  checkId: string;
  sectorId: string;
  epoch: bigint;
  status: SectorStatus | null;
  error: string | null;
}) {
  const checkedAt = new Date();
  const confirmed =
    input.status === null
      ? {}
      : {
          lastKnownStatus: input.status,
          lastObservedEpoch: input.epoch,
        };
  await prismaClient.$transaction(async (tx) => {
    await tx.sector_adapter_sector_health.upsert({
      where: { sectorAdapterSectorId: input.sectorId },
      create: {
        sectorAdapterSectorId: input.sectorId,
        ...confirmed,
        lastAttemptAt: checkedAt,
        lastError: input.error,
      },
      update: {
        ...confirmed,
        lastAttemptAt: checkedAt,
        lastError: input.error,
      },
    });
    await tx.sector_adapter_sector_health_history.create({
      data: {
        sectorHealthId: input.sectorId,
        checkId: input.checkId,
        observedStatus: input.status,
        observedEpoch: input.epoch,
        checkedAt,
        error: input.error,
      },
    });
    await tx.sector_adapter_health_check.update({
      where: { id: input.checkId },
      data: {
        checkedSectors: { increment: 1 },
        failedSectors: { increment: input.status === null ? 1 : 0 },
      },
    });
  });
}
