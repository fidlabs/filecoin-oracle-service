import { getAllClaimsFromClaimInspectorContract } from "../blockchain/claim-inspector-contract";
import { getClientAllocationIdsPerDealFromDCEvidenceContract } from "../blockchain/datacap-evidence-adapter-contract";
import { getDealsFromPoRepMarketContract } from "../blockchain/porep-market.contract";
import {
  getChainStateToDomain,
  getDealByOnChainIdFromDb,
  syncPoRepMarketContractDealsWithDb,
} from "../services/db/db-service";
import { baseLogger } from "../utils/logger";
import {
  DealState,
  PorepMarketContractDealView,
  PorepMarketDeal,
  PorepMarketDealClaim,
} from "../utils/types";

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

  const dealState = dealExistInDb.state as DealState;

  if (
    dealExistInDb &&
    dealState === DealState.Active &&
    !dealExistInDb.isAllocationsMatched
  ) {
    syncDealLogger.info(
      `Deal with ID ${porepMarketContractDealId} exists in database with Active state, but isAllocationsMatched is not set, will sync it`,
    );

    return true;
  }

  if (dealExistInDb && dealState !== DealState.Active) {
    syncDealLogger.info(
      `Deal with ID ${porepMarketContractDealId} exists in database with state ${dealExistInDb.state}, will not sync it`,
    );

    return false;
  }

  if (
    dealExistInDb &&
    dealState === DealState.Active &&
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

    const contractAllDeals: PorepMarketContractDealView[] =
      await getDealsFromPoRepMarketContract();

    syncDealLogger.info(
      `Fetched ${contractAllDeals.length} deals from PoRep Market contract`,
    );

    if (contractAllDeals.length === 0) {
      syncDealLogger.info(
        "No deals found in PoRep Market contract, skipping deal sync with database",
      );
      return;
    }

    const dealIdAllocationsMap: {
      [dealId: string]: {
        allocationIds?: bigint[];
        claims?: PorepMarketDealClaim[];
      };
    } = {};

    for (const dealView of contractAllDeals) {
      const deal = dealView.deal;
      const porepMarketContractDealId = deal.dealId;

      const shouldSyncClaims = await isDealEligibleForSyncClaims(
        porepMarketContractDealId,
      );

      if (shouldSyncClaims) {
        let matchedClaims: PorepMarketDealClaim[] | undefined;
        let requiredDealAllocations: bigint[] = [];

        requiredDealAllocations =
          await getClientAllocationIdsPerDealFromDCEvidenceContract(
            deal.dealId,
            deal.evidenceAdapter,
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

          const claimIds = claimsInfoFromDealInspectorContract[0];

          // get the matched claims from the helper contract
          matchedClaims = claimsInfoFromDealInspectorContract[1].map(
            (claim, index) => ({
              ...claim,
              claimId: claimIds[index],
            }),
          );

          dealIdAllocationsMap[porepMarketContractDealId.toString()] = {
            claims: matchedClaims,
          };
        }

        dealIdAllocationsMap[porepMarketContractDealId.toString()] = {
          ...dealIdAllocationsMap[porepMarketContractDealId.toString()],
          allocationIds: requiredDealAllocations,
        };
      }
    }

    const completedDealsWithAllocationInfo: PorepMarketDeal[] =
      contractAllDeals.map((dealView) => {
        const { deal } = dealView;
        const allocationInfo = dealIdAllocationsMap[deal.dealId.toString()];

        return {
          ...deal,
          ...dealView.data,
          ...dealView.timing,
          ...dealView.service,
          ...dealView.capacity,
          validatorContractAddress: deal.validator,
          evidenceAdapterContractAddress: deal.evidenceAdapter,
          state: getChainStateToDomain(deal.state),
          terms: {
            requestedSizeBytes: dealView.terms.requestedSizeBytes,
            durationEpochs: dealView.terms.durationEpochs,
          },
          payment: dealView.payment,
          requiredSLIs: dealView.requiredSLIs,
          evidenceStatus: {
            activeCoveredBytes: dealView.evidenceStatus.activeCoveredBytes,
            lastEvidenceRefreshEpoch:
              dealView.evidenceStatus.lastEvidenceRefreshEpoch,
            reasonCode: BigInt(dealView.evidenceStatus.reasonCode),
            result: BigInt(dealView.evidenceStatus.result),
          },
          allocationsRequiredCount: allocationInfo?.allocationIds?.length
            ? BigInt(allocationInfo.allocationIds.length)
            : undefined,
          allocationsMatchedCount: allocationInfo?.claims
            ? BigInt(allocationInfo.claims.length)
            : undefined,
          allocationIds: allocationInfo?.allocationIds,
          claims: allocationInfo?.claims,
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
