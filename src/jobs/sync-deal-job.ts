import { getClientAllocationIdsPerDeal } from "../blockchain/client-contract";
import { getDealsFromPoRepMarketContract } from "../blockchain/porep-market.contract";
import { getClientAllocationInfoByProviderIdFromDmobDb } from "../services/db-dmob-service";
import {
  getChainStateToDomain,
  syncPoRepMarketContractDealsWithDb,
} from "../services/db-service";
import { baseLogger } from "../utils/logger";
import { PorepMarketDeal } from "../utils/types";

const syncDealLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Sync Deal Job] " },
);

export async function syncDealsJob() {
  try {
    syncDealLogger.info("Job started");

    const contractAllDeals = await getDealsFromPoRepMarketContract();

    syncDealLogger.info(
      `Fetched ${contractAllDeals.length} deals from PoRep Market contract`,
    );

    if (contractAllDeals.length === 0) {
      syncDealLogger.info(
        "No deals found in PoRep Market contract, skipping deal sync with database",
      );
      return;
    }

    const dealIdAllocationInfoMap: {
      [dealId: string]: {
        dealStartEpoch?: bigint;
        dealEndEpoch?: bigint;
        allocationsMatchedCount?: bigint;
        requiredDealAllocationsCount?: bigint;
        allocationIds: bigint[];
      };
    } = {};

    for (const deal of contractAllDeals) {
      let allocationsInfo: {
        termStart?: bigint;
        termMax?: bigint;
        allocationsCount?: bigint;
      } = {};

      let requiredAllocationsCount: bigint | undefined;

      const requiredDealAllocations = await getClientAllocationIdsPerDeal(
        deal.dealId,
      );

      syncDealLogger.info(
        `Fetched ${requiredDealAllocations?.length || 0} required allocations for deal ${deal.dealId} from client contract`,
      );

      if (requiredDealAllocations.length) {
        syncDealLogger.info(
          `Fetching allocation info for client ${deal.client} from DMOB DB...`,
        );

        allocationsInfo = await getClientAllocationInfoByProviderIdFromDmobDb(
          deal.provider.toString(),
          requiredDealAllocations.map(Number),
        );

        requiredAllocationsCount = BigInt(requiredDealAllocations?.length);

        syncDealLogger.info(
          `Fetched allocation info for client ${deal.client} from DMOB DB, found ${allocationsInfo.allocationsCount} matching allocations for deal ${deal.dealId}`,
        );
      }

      dealIdAllocationInfoMap[deal.dealId.toString()] = {
        dealStartEpoch: allocationsInfo?.termStart,
        dealEndEpoch:
          allocationsInfo?.termStart &&
          allocationsInfo?.termMax &&
          allocationsInfo?.termStart + allocationsInfo?.termMax,
        allocationsMatchedCount: allocationsInfo?.allocationsCount,
        requiredDealAllocationsCount: requiredAllocationsCount,
        allocationIds: requiredDealAllocations || [],
      };
    }

    const completedDealsWithAllocationInfo: PorepMarketDeal[] =
      contractAllDeals.map((deal) => {
        const allocationInfo = dealIdAllocationInfoMap[deal.dealId.toString()];

        return {
          ...deal,
          validatorContractAddress: deal.validator,
          state: getChainStateToDomain(deal.state),
          dealStartEpoch: allocationInfo.dealStartEpoch,
          dealEndEpoch: allocationInfo.dealEndEpoch,
          allocationsRequiredCount:
            allocationInfo?.requiredDealAllocationsCount,
          allocationsMatchedCount: allocationInfo?.allocationsMatchedCount,
          allocationIds: allocationInfo?.allocationIds,
          isRailTerminated: false,
          isDealEndEpochSetOnChain: false,
        };
      });

    await syncPoRepMarketContractDealsWithDb(completedDealsWithAllocationInfo);
  } catch (error) {
    syncDealLogger.error({ error }, "Job failed");
  } finally {
    syncDealLogger.info("Job finished");
  }
}
