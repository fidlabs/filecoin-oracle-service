import { getAllClaimsFromClaimInspectorContract } from "../blockchain/claim-inspector-contract";
import { getClientAllocationIdsPerDeal } from "../blockchain/client-contract";

import { getDealsFromPoRepMarketContract } from "../blockchain/porep-market.contract";
import {
  getChainStateToDomain,
  getDealByOnChainIdFromDb,
  syncPoRepMarketContractDealsWithDb,
} from "../services/db/db-service";
import { baseLogger } from "../utils/logger";
import { PorepMarketDeal, PorepMarketDealClaim } from "../utils/types";

const syncDealLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Sync Deal Job] " },
);

const isDealEligibleForSyncClaims = async (
  porepMarketContractDealId: bigint,
) => {
  const dealExistInDb = await getDealByOnChainIdFromDb(
    porepMarketContractDealId,
  );

  if (!dealExistInDb) {
    syncDealLogger.info(
      `Deal with ID ${porepMarketContractDealId} does not exist in database, will sync it`,
    );

    return true;
  }

  if (
    dealExistInDb &&
    dealExistInDb.state === "Completed" &&
    !dealExistInDb.isAllocationsMatched
  ) {
    syncDealLogger.info(
      `Deal with ID ${porepMarketContractDealId} exists in database with Completed state, but isAllocationsMatched is not set, will sync it`,
    );

    return true;
  }

  if (dealExistInDb && dealExistInDb.state !== "Completed") {
    syncDealLogger.info(
      `Deal with ID ${porepMarketContractDealId} exists in database with state ${dealExistInDb.state}, will not sync it`,
    );

    return false;
  }

  if (
    dealExistInDb &&
    dealExistInDb.state === "Completed" &&
    dealExistInDb.isAllocationsMatched
  ) {
    syncDealLogger.info(
      `Deal with ID ${porepMarketContractDealId} exists in database and allocations are matched with claims, will not sync it`,
    );
  }

  return false;
};

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
        allocationIds?: bigint[];
        claims?: PorepMarketDealClaim[];
      };
    } = {};

    for (const deal of contractAllDeals) {
      const porepMarketContractDealId = deal.dealId;

      const shouldSyncClaims = await isDealEligibleForSyncClaims(
        porepMarketContractDealId,
      );

      if (shouldSyncClaims) {
        let claimsInfo: {
          minTermStart?: bigint;
          maxTermMin?: bigint;
          matchedClaims?: PorepMarketDealClaim[];
        } = {};

        let requiredAllocationsCount: bigint | undefined;
        let requiredDealAllocations: bigint[] = [];

        requiredDealAllocations = await getClientAllocationIdsPerDeal(
          deal.dealId,
        );

        syncDealLogger.info(
          `Fetched ${requiredDealAllocations?.length || 0} required allocations for deal ${deal.dealId} from client contract`,
        );

        if (requiredDealAllocations.length) {
          syncDealLogger.info(
            `Fetching claims info for client ${deal.client} from deal inspector contract...`,
          );

          const claimsInfoFromDealInspectorContract =
            await getAllClaimsFromClaimInspectorContract(deal.dealId);

          syncDealLogger.info(
            `Fetched claims info for deal ${deal.dealId} from Deal Inspector contract, total success claims count: ${claimsInfoFromDealInspectorContract[1].length}`,
          );

          requiredAllocationsCount = BigInt(requiredDealAllocations?.length);

          const claimsCountFromContract = claimsInfoFromDealInspectorContract[1]
            .length
            ? BigInt(claimsInfoFromDealInspectorContract[1].length)
            : BigInt(0);

          // If the count of successful claims from the contract matches the count of required allocations,
          // it means all required allocations have been successfully claimed.
          if (
            claimsCountFromContract &&
            claimsCountFromContract === requiredAllocationsCount
          ) {
            // Get the min term start and max term min across all claims for the deal
            // to calculate the deal start and end epoch
            const termStart = claimsInfoFromDealInspectorContract[1]
              .map((claim) => claim.term_start)
              .reduce((a, b) => (a < b ? a : b));

            const termMin = claimsInfoFromDealInspectorContract[1]
              .map((claim) => claim.term_min)
              .reduce((a, b) => (a > b ? a : b));

            claimsInfo = {
              minTermStart: termStart,
              maxTermMin: termMin,
            };
          }

          const claimIds = claimsInfoFromDealInspectorContract[0];

          // get the matched claims from the helper contract
          claimsInfo.matchedClaims = claimsInfoFromDealInspectorContract[1].map(
            (claim, index) => ({
              provider: claim.provider,
              client: claim.client,
              data: claim.data,
              size: claim.size,
              term_min: claim.term_min,
              term_max: claim.term_max,
              term_start: claim.term_start,
              sector: claim.sector,
              claimId: claimIds[index],
            }),
          );

          dealIdAllocationInfoMap[porepMarketContractDealId.toString()] = {
            dealStartEpoch: claimsInfo?.minTermStart,
            dealEndEpoch:
              claimsInfo?.minTermStart &&
              claimsInfo?.maxTermMin &&
              claimsInfo?.minTermStart + claimsInfo?.maxTermMin,
            allocationsMatchedCount: BigInt(
              claimsInfo?.matchedClaims?.length || 0,
            ),
            claims: claimsInfo?.matchedClaims,
          };
        }

        dealIdAllocationInfoMap[porepMarketContractDealId.toString()] = {
          ...dealIdAllocationInfoMap[porepMarketContractDealId.toString()],
          requiredDealAllocationsCount: requiredAllocationsCount,
          allocationIds: requiredDealAllocations,
        };
      }
    }

    const completedDealsWithAllocationInfo: PorepMarketDeal[] =
      contractAllDeals.map((deal) => {
        const allocationInfo = dealIdAllocationInfoMap[deal.dealId.toString()];

        return {
          ...deal,
          proposedAtBlock: deal.proposedAtBlock,
          validatorContractAddress: deal.validator,
          state: getChainStateToDomain(deal.state),
          dealStartEpoch: allocationInfo?.dealStartEpoch,
          dealEndEpoch: allocationInfo?.dealEndEpoch,
          allocationsRequiredCount:
            allocationInfo?.requiredDealAllocationsCount,
          allocationsMatchedCount: allocationInfo?.allocationsMatchedCount,
          allocationIds: allocationInfo?.allocationIds,
          claims: allocationInfo?.claims,
          isRailTerminated: false,
          isDealEndEpochSetOnChain: false,
        };
      });

    syncDealLogger.info(
      `Syncing ${completedDealsWithAllocationInfo.length} deals with database...`,
    );

    await syncPoRepMarketContractDealsWithDb(completedDealsWithAllocationInfo);

    syncDealLogger.info(
      `Successfully synced ${completedDealsWithAllocationInfo.length} deals with database`,
    );
  } catch (error) {
    syncDealLogger.error({ error }, "Job failed");
  } finally {
    syncDealLogger.info("Job finished");
  }
}
