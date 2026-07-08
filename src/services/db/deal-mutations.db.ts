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
