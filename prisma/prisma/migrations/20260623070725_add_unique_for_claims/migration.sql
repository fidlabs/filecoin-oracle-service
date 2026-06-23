/*
  Warnings:

  - A unique constraint covering the columns `[claimId,sector,provider]` on the table `porep_market_deal_claim` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_claim_claimId_sector_provider_key" ON "porep_market_deal_claim"("claimId", "sector", "provider");
