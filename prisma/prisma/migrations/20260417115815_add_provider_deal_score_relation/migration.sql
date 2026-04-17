/*
  Warnings:

  - You are about to drop the `provider_score` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "provider_score";

-- CreateTable
CREATE TABLE "porep_market_deal_provider_score" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "providerId" BIGINT NOT NULL,
    "calculatedScore" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "porep_market_deal_provider_score_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "porep_market_deal_provider_score_providerId_idx" ON "porep_market_deal_provider_score"("providerId");

-- AddForeignKey
ALTER TABLE "porep_market_deal_provider_score" ADD CONSTRAINT "porep_market_deal_provider_score_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
