import { DealEvidenceStatus } from "../../utils/types";
import { prismaClient } from "./db-client";

export async function storeLastSettlementToDb(
  porepMarketDealId: string,
  epoch: bigint,
  settlementAt = new Date(),
) {
  return prismaClient.porep_market_deal_settlement_history.create({
    data: {
      porepMarketDealId,
      epoch,
      settlementAt,
    },
  });
}

export async function markUrlFinderSliTargetTriggeredInDb(
  onChainDealId: bigint,
) {
  return prismaClient.porep_market_deal.update({
    where: {
      onChainDealId,
    },
    data: {
      urlFinderSliTargetTriggeredAt: new Date(),
    },
  });
}

export async function setActivatePaymentAtInDb(onChainDealId: bigint) {
  return prismaClient.porep_market_deal.update({
    where: {
      onChainDealId,
    },
    data: {
      activatePaymentAt: new Date(),
    },
  });
}

export async function upsertEvidenceStatusInDb({
  onChainDealId,
  porepMarketDealId,
  evidenceStatus,
}: {
  onChainDealId: bigint;
  porepMarketDealId: string;
  evidenceStatus: DealEvidenceStatus;
}) {
  return prismaClient.porep_market_deal_evidence_status.upsert({
    where: {
      porepMarketDealId,
    },
    create: {
      porepMarketDealId,
      onChainDealId,
      ...evidenceStatus,
    },
    update: evidenceStatus,
  });
}
