import { getAllClaimsFromClaimInspectorContract } from "../blockchain/claim-inspector-contract";
import {
  getAllocationIdsPerDealFromDCEvidenceContract,
  getClaimIdsPerDealFromDCEvidenceContract,
  getDealAllocationStatusFromDCEvidenceContract,
} from "../blockchain/datacap-evidence-adapter-contract";
import { getDealsFromPoRepMarketViewContract } from "../blockchain/porep-market-view-helper-contract";
import {
  getChainDealTypeToDomain,
  getChainStateToDomain,
  getDealsFromDb,
  syncPoRepMarketContractDealsWithDb,
  toPrismaEvidenceResult,
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

const getClaimsSyncDecision = (
  contractState: DealState,
  isAllocationsMatched?: boolean,
) => {
  if (isAllocationsMatched === undefined) {
    return {
      shouldSync: true,
      reason: "deal does not exist in database",
    };
  }

  if (contractState !== DealState.Active) {
    return {
      shouldSync: false,
      reason: `contract state is ${contractState}`,
    };
  }

  if (isAllocationsMatched) {
    return {
      shouldSync: false,
      reason: "allocations are already matched",
    };
  }

  return {
    shouldSync: true,
    reason: "active deal has unmatched allocations",
  };
};

async function prepareDealForSync(
  dealView: PorepMarketContractDealView,
  existingIsAllocationsMatched?: boolean,
): Promise<PorepMarketDeal> {
  const { deal } = dealView;
  const dealId = deal.dealId;

  const dataCapAllocationStatus =
    await getDealAllocationStatusFromDCEvidenceContract(
      dealId,
      deal.evidenceAdapter,
    );

  let allocationIds: bigint[] | undefined;
  let claims: PorepMarketDealClaim[] | undefined;

  const contractState = getChainStateToDomain(deal.state);
  const claimsSyncDecision = getClaimsSyncDecision(
    contractState,
    existingIsAllocationsMatched,
  );

  syncDealLogger.info(
    `Claims sync for deal ${dealId}: ${claimsSyncDecision.shouldSync ? "required" : "skipped"} (${claimsSyncDecision.reason})`,
  );

  if (claimsSyncDecision.shouldSync) {
    const [dealAllocationIds, dealClaimIds] = await Promise.all([
      getAllocationIdsPerDealFromDCEvidenceContract(
        dealId,
        deal.evidenceAdapter,
      ),
      getClaimIdsPerDealFromDCEvidenceContract(dealId, deal.evidenceAdapter),
    ]);

    allocationIds = [...dealAllocationIds, ...dealClaimIds];

    syncDealLogger.info(
      `Fetched ${allocationIds.length} required allocations for deal ${dealId} from client contract`,
    );

    if (allocationIds.length) {
      syncDealLogger.info(
        `Fetching claims info for client ${deal.client} from deal inspector contract...`,
      );

      const [claimIds, matchedClaims] =
        await getAllClaimsFromClaimInspectorContract(dealId);

      claims = matchedClaims.map((claim, index) => ({
        ...claim,
        claimId: claimIds[index],
      }));

      syncDealLogger.info(
        `Fetched claims info for deal ${dealId} from Deal Inspector contract, total success claims count: ${claims.length}`,
      );
    }
  }

  return {
    ...deal,
    ...dealView.data,
    ...dealView.service,
    ...dealView.capacity,
    validatorContractAddress: deal.validator,
    evidenceAdapterContractAddress: deal.evidenceAdapter,
    dealType: getChainDealTypeToDomain(deal.dealType),
    state: contractState,
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
      checkedClaims: dealView.evidenceStatus.checkedClaims,
      totalClaims: dealView.evidenceStatus.totalClaims,
      result: toPrismaEvidenceResult(dealView.evidenceStatus.result),
    },
    allocationsRequiredCount: allocationIds?.length
      ? BigInt(allocationIds.length)
      : undefined,
    allocationsMatchedCount: claims ? BigInt(claims.length) : undefined,
    dataCapAllocationStatus,
    allocationIds,
    claims,
  };
}

export async function syncDealsJob() {
  try {
    syncDealLogger.info("Job started");

    const contractAllDeals: PorepMarketContractDealView[] =
      await getDealsFromPoRepMarketViewContract();

    syncDealLogger.info(
      `Fetched ${contractAllDeals.length} deals from PoRep Market contract`,
    );

    if (contractAllDeals.length === 0) {
      syncDealLogger.info(
        "No deals found in PoRep Market contract, skipping deal sync with database",
      );
      return;
    }

    const existingDeals = await getDealsFromDb(
      contractAllDeals.map(({ deal }) => deal.dealId),
    );

    const existingDealsMap = new Map(
      existingDeals.map((deal) => [deal.onChainDealId.toString(), deal]),
    );

    const preparedDeals: PorepMarketDeal[] = [];
    let failedDealsCount = 0;

    for (const dealView of contractAllDeals) {
      const dealId = dealView.deal.dealId;

      try {
        const preparedDeal = await prepareDealForSync(
          dealView,
          existingDealsMap.get(dealId.toString())?.isAllocationsMatched,
        );

        preparedDeals.push(preparedDeal);
      } catch (error) {
        failedDealsCount += 1;
        syncDealLogger.error(
          { error, onChainDealId: dealId },
          "Failed to prepare deal, skipping it",
        );
      }
    }

    if (preparedDeals.length > 0) {
      syncDealLogger.info(
        `Syncing ${preparedDeals.length} prepared deals with database...`,
      );

      await syncPoRepMarketContractDealsWithDb(preparedDeals);

      syncDealLogger.info(
        `Successfully synced ${preparedDeals.length} deals with database`,
      );
    }

    syncDealLogger.info(
      `Deal sync summary: fetched ${contractAllDeals.length}, prepared ${preparedDeals.length}, failed to prepare ${failedDealsCount}`,
    );
  } catch (error) {
    syncDealLogger.error({ error }, "Job failed");
    throw error;
  } finally {
    syncDealLogger.info("Job finished");
  }
}
