import { Address } from "viem";
import {
  refreshEvidenceStatusOnPoRepMarketContract,
  simulateRefreshEvidenceStatusOnPoRepMarketContract,
} from "../../blockchain/porep-market.contract";
import {
  getRefreshStateFromSectorEvidenceContract,
  getSectorCountFromSectorEvidenceContract,
  getSectorNumbersFromSectorEvidenceContract,
} from "../../blockchain/sector-evidence-adapter-contract";
import { SERVICE_CONFIG } from "../../config/env";
import {
  EvidenceResult,
  getSectorDealsToRefreshEvidenceStatusFromDb,
  storeOnChainTransactionToDb,
  upsertEvidenceStatusInDb,
} from "../../services/db/db-service";
import { PorepMarketDealDto } from "../../services/db/dto/porep-market-deal.dto";
import { fetchSectorLocation } from "../../services/filecoin-api-service";
import { baseLogger } from "../../utils/logger";
import {
  encodeSectorLocationsEvidenceData,
  NO_DEADLINE,
  NO_PARTITION,
} from "../../utils/sector-evidence-data";
import { SectorLocation } from "../../utils/types";

const sectorRefreshEvidenceStatusLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Sector Refresh Evidence Status Job] " },
);

const SECTOR_REFRESH_BATCH_SIZE = BigInt(
  SERVICE_CONFIG.SECTOR_REFRESH_BATCH_SIZE,
);

async function getSectorLocations(
  provider: bigint,
  sectorNumbers: bigint[],
): Promise<SectorLocation[]> {
  return Promise.all(
    sectorNumbers.map(async (sectorNumber) => {
      const location = await fetchSectorLocation(`f0${provider}`, sectorNumber);

      if (!location) {
        return { deadline: NO_DEADLINE, partition: NO_PARTITION };
      }

      return { deadline: location.Deadline, partition: location.Partition };
    }),
  );
}

async function getSimulatedLocationsCount(
  onChainDealId: bigint,
  locations: SectorLocation[],
): Promise<number> {
  let locationsCount = locations.length;

  while (true) {
    try {
      await simulateRefreshEvidenceStatusOnPoRepMarketContract(
        onChainDealId,
        encodeSectorLocationsEvidenceData(locations.slice(0, locationsCount)),
      );

      return locationsCount;
    } catch (error) {
      if (locationsCount === 1) {
        throw error;
      }

      locationsCount = Math.ceil(locationsCount / 2);

      sectorRefreshEvidenceStatusLogger.warn(
        { error },
        `Refresh simulation failed for deal ${onChainDealId}, retrying with ${locationsCount} sectors`,
      );
    }
  }
}

async function refreshSectorDealEvidenceStatus(deal: PorepMarketDealDto) {
  const evidenceAdapterAddress = deal.evidenceAdapterContractAddress as Address;

  const sectorCount = await getSectorCountFromSectorEvidenceContract(
    deal.onChainDealId,
    evidenceAdapterAddress,
  );

  if (sectorCount === 0n) {
    sectorRefreshEvidenceStatusLogger.info(
      `Deal ${deal.onChainDealId} has no recorded sectors, skipping refreshEvidenceStatus`,
    );
    return;
  }

  let { nextSectorIndex } = await getRefreshStateFromSectorEvidenceContract(
    deal.onChainDealId,
    evidenceAdapterAddress,
  );

  while (nextSectorIndex < sectorCount) {
    const batchEnd =
      nextSectorIndex + SECTOR_REFRESH_BATCH_SIZE < sectorCount
        ? nextSectorIndex + SECTOR_REFRESH_BATCH_SIZE
        : sectorCount;

    const sectorNumbers = await getSectorNumbersFromSectorEvidenceContract(
      deal.onChainDealId,
      evidenceAdapterAddress,
      nextSectorIndex,
      batchEnd,
    );

    const locations = await getSectorLocations(deal.provider, sectorNumbers);

    const locationsCount = await getSimulatedLocationsCount(
      deal.onChainDealId,
      locations,
    );

    sectorRefreshEvidenceStatusLogger.info(
      `Refreshing sectors ${nextSectorIndex}..${nextSectorIndex + BigInt(locationsCount)} of ${sectorCount} for deal ${deal.onChainDealId}`,
    );

    const refreshEvidenceStatusResult =
      await refreshEvidenceStatusOnPoRepMarketContract(
        deal.onChainDealId,
        encodeSectorLocationsEvidenceData(locations.slice(0, locationsCount)),
      );

    await storeOnChainTransactionToDb(
      deal.onChainDealId,
      refreshEvidenceStatusResult.transactionResult,
    );

    const { status } = refreshEvidenceStatusResult;

    if (status.result !== EvidenceResult.Partial) {
      await upsertEvidenceStatusInDb({
        onChainDealId: deal.onChainDealId,
        porepMarketDealId: deal.id,
        evidenceStatus: status,
      });

      sectorRefreshEvidenceStatusLogger.info(
        { status },
        `Completed evidence refresh for deal ${deal.onChainDealId} with result ${status.result}`,
      );
      return;
    }

    nextSectorIndex = status.checkedItems;
  }
}

export async function sectorRefreshEvidenceStatusJob() {
  try {
    sectorRefreshEvidenceStatusLogger.info("Job started");

    const deals = await getSectorDealsToRefreshEvidenceStatusFromDb();

    if (!deals.length) {
      sectorRefreshEvidenceStatusLogger.info(
        "No Active Sector deals found in local database to refresh evidence status",
      );
      return;
    }

    sectorRefreshEvidenceStatusLogger.info(
      `Found ${deals.length} Active Sector deals in local database to refresh evidence status`,
    );

    for (const deal of deals) {
      try {
        await refreshSectorDealEvidenceStatus(deal);
      } catch (error) {
        sectorRefreshEvidenceStatusLogger.error(
          { error, onChainDealId: deal.onChainDealId },
          `Failed to refresh evidence status for deal ${deal.onChainDealId}`,
        );
      }
    }
  } catch (error) {
    sectorRefreshEvidenceStatusLogger.error({ error }, "Job failed");
    throw error;
  } finally {
    sectorRefreshEvidenceStatusLogger.info("Job finished");
  }
}
