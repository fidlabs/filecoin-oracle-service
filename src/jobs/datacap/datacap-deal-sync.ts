import {
  getAllocationIdsPerDealFromDCEvidenceContract,
  getClaimIdsPerDealFromDCEvidenceContract,
  getDealAllocationStatusFromDCEvidenceContract,
} from "../../blockchain/datacap-evidence-adapter-contract";
import { getAllClaimsFromSectorStatusInspectorContract } from "../../blockchain/sector-status-inspector-contract";
import { DataCapAllocationStatus } from "../../services/db/db-service";
import { baseLogger } from "../../utils/logger";
import {
  DealEvidenceSyncData,
  PorepMarketContractDealView,
  PorepMarketDealClaim,
} from "../../utils/types";

const dataCapDealSyncLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Sync Deal Job][DataCap] " },
);

const getClaimsSyncDecision = (
  dataCapAllocationStatus: DataCapAllocationStatus,
  isAllocationsMatched?: boolean,
) => {
  if (isAllocationsMatched === undefined) {
    return {
      shouldSync: true,
      reason: "deal does not exist in database",
    };
  }

  if (
    dataCapAllocationStatus === DataCapAllocationStatus.Inactive ||
    dataCapAllocationStatus === DataCapAllocationStatus.None
  ) {
    return {
      shouldSync: false,
      reason: `contract state is ${dataCapAllocationStatus}`,
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
    reason: "deal has unmatched allocations",
  };
};

export async function prepareDataCapDealEvidenceForSync(
  dealView: PorepMarketContractDealView,
  existingIsAllocationsMatched?: boolean,
): Promise<DealEvidenceSyncData> {
  const { deal } = dealView;
  const dealId = deal.dealId;

  const dataCapAllocationStatus =
    await getDealAllocationStatusFromDCEvidenceContract(
      dealId,
      deal.evidenceAdapter,
    );

  let allocationIds: bigint[] | undefined;
  let claims: PorepMarketDealClaim[] | undefined;

  const claimsSyncDecision = getClaimsSyncDecision(
    dataCapAllocationStatus,
    existingIsAllocationsMatched,
  );

  dataCapDealSyncLogger.info(
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

    dataCapDealSyncLogger.info(
      `Fetched ${allocationIds.length} required allocations for deal ${dealId} from client contract`,
    );

    if (allocationIds.length) {
      dataCapDealSyncLogger.info(
        `Fetching claims info for client ${deal.client} from deal inspector contract...`,
      );

      const [claimIds, matchedClaims] =
        await getAllClaimsFromSectorStatusInspectorContract(dealId);

      claims = matchedClaims.map((claim, index) => ({
        ...claim,
        claimId: claimIds[index],
      }));

      dataCapDealSyncLogger.info(
        `Fetched claims info for deal ${dealId} from Deal Inspector contract, total success claims count: ${claims.length}`,
      );
    }
  }

  const allocationsRequiredCount = allocationIds?.length
    ? BigInt(allocationIds.length)
    : undefined;
  const allocationsMatchedCount = claims ? BigInt(claims.length) : undefined;

  return {
    isEvidenceComplete:
      allocationsRequiredCount !== undefined &&
      allocationsMatchedCount !== undefined
        ? allocationsRequiredCount === allocationsMatchedCount
        : undefined,
    dataCapEvidence: {
      allocationsRequiredCount,
      allocationsMatchedCount,
      dataCapAllocationStatus,
      allocationIds,
      claims,
    },
  };
}
