import { getEvidenceAdapterTypeFromContract } from "../blockchain/evidence-adapter-contract";
import { getDealsFromPoRepMarketViewContract } from "../blockchain/porep-market-view-helper-contract";
import {
  getChainDealTypeToDomain,
  getChainStateToDomain,
  getDealsFromDb,
  syncPoRepMarketContractDealsWithDb,
  toPrismaEvidenceResult,
} from "../services/db/db-service";
import { baseLogger } from "../utils/logger";
import { PorepMarketContractDealView, PorepMarketDeal } from "../utils/types";
import { getEvidenceAdapter } from "./evidence-adapters";

const syncDealLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Sync Deal Job] " },
);

type ExistingDeal = Awaited<ReturnType<typeof getDealsFromDb>>[number];

async function prepareDealForSync(
  dealView: PorepMarketContractDealView,
  existingDeal?: ExistingDeal,
): Promise<PorepMarketDeal> {
  const { deal } = dealView;

  const evidenceAdapterType = await getEvidenceAdapterTypeFromContract(
    deal.evidenceAdapter,
  );

  const evidence = await getEvidenceAdapter(
    evidenceAdapterType,
  ).prepareEvidenceForSync(dealView, existingDeal);

  return {
    ...deal,
    ...dealView.data,
    ...dealView.service,
    ...dealView.capacity,
    validatorContractAddress: deal.validator,
    evidenceAdapterContractAddress: deal.evidenceAdapter,
    evidenceAdapterType,
    dealType: getChainDealTypeToDomain(deal.dealType),
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
      checkedClaims: dealView.evidenceStatus.checkedClaims,
      totalClaims: dealView.evidenceStatus.totalClaims,
      result: toPrismaEvidenceResult(dealView.evidenceStatus.result),
    },
    ...evidence,
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
          existingDealsMap.get(dealId.toString()),
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
