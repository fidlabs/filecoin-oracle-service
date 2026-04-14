-- AlterTable
ALTER TABLE "porep_market_deal" ADD COLUMN     "isDealEndEpochSetOnChain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "modifyRailPaymentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "porep_market_deal_settlement_history" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "epoch" BIGINT NOT NULL,
    "settlementAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "porep_market_deal_settlement_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "porep_market_deal_settlement_history_porepMarketDealId_idx" ON "porep_market_deal_settlement_history"("porepMarketDealId");

-- AddForeignKey
ALTER TABLE "porep_market_deal_settlement_history" ADD CONSTRAINT "porep_market_deal_settlement_history_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
