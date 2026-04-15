import { getClientAllocationIdsPerDeal } from "../blockchain/client-contract";
import { getDealsFromPoRepMarketContract } from "../blockchain/porep-market.contract";
import { getClientAllocationInfoByProviderIdFromDmobDb } from "../services/db-dmob-service";
import {
  getChainStateToDomain,
  syncPoRepMarketContractDealsWithDb,
} from "../services/db-service";
import { baseLogger } from "../utils/logger";
import { DealState, PorepMarketDeal } from "../utils/types";

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
        dealStartEpoch?: number;
        dealEndEpoch?: number;
        allocationsMatchedCount?: number;
        requiredDealAllocationsCount?: number;
        isAllocationsMatched: boolean;
        allocationIds: bigint[];
      };
    } = {};

    for (const deal of contractAllDeals) {
      let allocationsInfo: {
        termStart?: number;
        termMax?: number;
        allocationsCount?: number;
      } = {};

      let requiredDealAllocations: bigint[] | undefined = [];
      let isAllocationsMatched = false;

      const porepMarketDealState = getChainStateToDomain(deal.state);

      // validate and match the allocations for the completed deals only
      // events should exists
      if (porepMarketDealState === DealState.Completed) {
        requiredDealAllocations = await getClientAllocationIdsPerDeal(
          deal.dealId,
        );

        syncDealLogger.info(
          `Fetching allocation info for client ${deal.client} from DMOB DB...`,
        );

        allocationsInfo = await getClientAllocationInfoByProviderIdFromDmobDb(
          deal.provider.toString(),
          requiredDealAllocations.map(Number),
        );

        syncDealLogger.info(
          `Fetched allocation info for client ${deal.client} from DMOB DB, found ${allocationsInfo.allocationsCount} matching allocations for deal ${deal.dealId}`,
        );

        isAllocationsMatched =
          allocationsInfo.allocationsCount === requiredDealAllocations.length;
      }

      dealIdAllocationInfoMap[deal.dealId.toString()] = {
        dealStartEpoch: allocationsInfo?.termStart,
        dealEndEpoch:
          allocationsInfo?.termStart &&
          allocationsInfo?.termMax &&
          allocationsInfo?.termStart + allocationsInfo?.termMax,
        allocationsMatchedCount: allocationsInfo?.allocationsCount,
        requiredDealAllocationsCount: requiredDealAllocations?.length,
        allocationIds: requiredDealAllocations || [],
        isAllocationsMatched,
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
          allocationsRequiredCount: allocationInfo?.allocationsMatchedCount,
          allocationsMatchedCount: allocationInfo?.allocationsMatchedCount,
          isAllocationsMatched: allocationInfo?.isAllocationsMatched,
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
