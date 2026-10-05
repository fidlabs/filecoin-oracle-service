-- CreateEnum
CREATE TYPE "EvidenceAdapterType" AS ENUM ('DataCap', 'Sector');

-- AlterTable
ALTER TABLE "porep_market_deal" ADD COLUMN     "evidenceAdapterType" "EvidenceAdapterType" NOT NULL DEFAULT 'DataCap',
ADD COLUMN     "isEvidenceComplete" BOOLEAN NOT NULL DEFAULT false;

UPDATE "porep_market_deal" SET "isEvidenceComplete" = "isAllocationsMatched";

ALTER TABLE "porep_market_deal" ALTER COLUMN "evidenceAdapterType" DROP DEFAULT;

-- CreateTable
CREATE TABLE "porep_market_deal_sector_receipt" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "onChainDealId" BIGINT NOT NULL,
    "providerActorId" BIGINT NOT NULL,
    "pieceCount" BIGINT NOT NULL,
    "acceptedPieceCount" BIGINT NOT NULL,
    "acceptedBytes" BIGINT NOT NULL,
    "minimumCommitmentEpoch" BIGINT NOT NULL,
    "activated" BOOLEAN NOT NULL,
    "sectorCount" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "porep_market_deal_sector_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "porep_market_deal_sector" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "onChainDealId" BIGINT NOT NULL,
    "sectorIndex" BIGINT NOT NULL,
    "sectorNumber" BIGINT NOT NULL,
    "coveredBytes" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "porep_market_deal_sector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_sector_receipt_porepMarketDealId_key" ON "porep_market_deal_sector_receipt"("porepMarketDealId");

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_sector_receipt_onChainDealId_key" ON "porep_market_deal_sector_receipt"("onChainDealId");

-- CreateIndex
CREATE INDEX "porep_market_deal_sector_porepMarketDealId_idx" ON "porep_market_deal_sector"("porepMarketDealId");

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_sector_porepMarketDealId_sectorIndex_key" ON "porep_market_deal_sector"("porepMarketDealId", "sectorIndex");

-- AddForeignKey
ALTER TABLE "porep_market_deal_sector_receipt" ADD CONSTRAINT "porep_market_deal_sector_receipt_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porep_market_deal_sector" ADD CONSTRAINT "porep_market_deal_sector_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

