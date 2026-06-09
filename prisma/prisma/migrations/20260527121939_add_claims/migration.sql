-- CreateEnum
CREATE TYPE "SectorStatus" AS ENUM ('Dead', 'Active', 'Faulty');

-- CreateTable
CREATE TABLE "porep_market_deal_claim" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "claimId" BIGINT NOT NULL,
    "sector" BIGINT NOT NULL,
    "status" "SectorStatus",

    CONSTRAINT "porep_market_deal_claim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "porep_market_deal_claim_porepMarketDealId_idx" ON "porep_market_deal_claim"("porepMarketDealId");

-- AddForeignKey
ALTER TABLE "porep_market_deal_claim" ADD CONSTRAINT "porep_market_deal_claim_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
