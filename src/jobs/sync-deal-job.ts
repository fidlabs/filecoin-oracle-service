import { getClientAllocationIdsPerDeal } from "../blockchain/client-contract";
import {
  getAllClaimsFromDealInspectorContract,
  getClaimsFromDealInspectorContract,
} from "../blockchain/deal-inspector-contract";
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
        claims?: PorepMarketDealClaim[];
      };
    } = {};

    for (const deal of contractAllDeals) {
      let claimsInfo: {
        minTermStart?: bigint;
        maxTermMin?: bigint;
        matchedClaims?: PorepMarketDealClaim[];
      } = {};

      let requiredAllocationsCount: bigint | undefined;
      let requiredDealAllocations: bigint[] = [];

      const dealExistInDb = await getDealByOnChainIdFromDb(deal.dealId);

      if (!dealExistInDb?.isAllocationsMatched) {
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
            await getAllClaimsFromDealInspectorContract(deal.dealId);

          syncDealLogger.info(
            `Fetched claims info for deal ${deal.dealId} from Deal Inspector contract, total success claims count: ${claimsInfo.matchedClaims?.length}`,
          );

          requiredAllocationsCount = BigInt(requiredDealAllocations?.length);

          const claimsCountFromContract = claimsInfoFromDealInspectorContract
            .batch_info.success_count
            ? BigInt(
                claimsInfoFromDealInspectorContract.batch_info.success_count,
              )
            : BigInt(0);

          // If the count of successful claims from the contract matches the count of required allocations, we can be certain that all required allocations have been matched, and we can set the matched count to be the same as required count. This is because each successful claim corresponds to a matched allocation, and if they match in count, it means all required allocations have been successfully claimed.
          if (
            claimsCountFromContract &&
            claimsCountFromContract === requiredAllocationsCount
          ) {
            const termStart = claimsInfoFromDealInspectorContract.claims
              .map((claim) => claim.term_start)
              .reduce((a, b) => (a < b ? a : b));

            const termMin = claimsInfoFromDealInspectorContract.claims
              .map((claim) => claim.term_min)
              .reduce((a, b) => (a > b ? a : b));

            claimsInfo = {
              minTermStart: termStart,
              maxTermMin: termMin,
            };
          }

          // TODO: get the matchedCLaims from the helper contract
          //claimsInfo.matchedClaims =
        }
      }

      dealIdAllocationInfoMap[deal.dealId.toString()] = {
        dealStartEpoch: claimsInfo?.minTermStart,
        dealEndEpoch:
          claimsInfo?.minTermStart &&
          claimsInfo?.maxTermMin &&
          claimsInfo?.minTermStart + claimsInfo?.maxTermMin,
        allocationsMatchedCount: BigInt(claimsInfo?.matchedClaims?.length || 0),
        requiredDealAllocationsCount: requiredAllocationsCount,
        allocationIds: requiredDealAllocations,
        claims: claimsInfo?.matchedClaims,
      };
    }

    const completedDealsWithAllocationInfo: PorepMarketDeal[] =
      contractAllDeals.map((deal) => {
        const allocationInfo = dealIdAllocationInfoMap[deal.dealId.toString()];

        return {
          ...deal,
          proposedAtBlock: deal.proposedAtBlock,
          validatorContractAddress: deal.validator,
          state: getChainStateToDomain(deal.state),
          dealStartEpoch: allocationInfo.dealStartEpoch,
          dealEndEpoch: allocationInfo.dealEndEpoch,
          allocationsRequiredCount:
            allocationInfo?.requiredDealAllocationsCount,
          allocationsMatchedCount: allocationInfo?.allocationsMatchedCount,
          allocationIds: allocationInfo.allocationIds,
          claims: allocationInfo.claims,
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
