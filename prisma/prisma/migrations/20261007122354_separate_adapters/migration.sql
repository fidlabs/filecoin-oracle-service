CREATE TYPE "EvidenceAdapterType" AS ENUM ('DataCap', 'Sector');

ALTER TABLE "porep_market_deal"
  ADD COLUMN "evidenceAdapterType" "EvidenceAdapterType" NOT NULL DEFAULT 'DataCap',
  ADD COLUMN "isEvidenceComplete" BOOLEAN NOT NULL DEFAULT false;

UPDATE "porep_market_deal" SET "isEvidenceComplete" = "isAllocationsMatched";

ALTER TABLE "porep_market_deal" ALTER COLUMN "evidenceAdapterType" DROP DEFAULT;

CREATE TABLE "datacap_adapter" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "onChainDealId" BIGINT NOT NULL,
    "allocationsRequiredCount" BIGINT,
    "allocationsMatchedCount" BIGINT,
    "isAllocationsMatched" BOOLEAN NOT NULL,
    "dataCapAllocationStatus" "DataCapAllocationStatus" NOT NULL DEFAULT 'None',
    "allocationIds" BIGINT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "datacap_adapter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "datacap_adapter_claim" (
    "id" UUID NOT NULL,
    "dataCapAdapterId" UUID NOT NULL,
    "claimId" BIGINT NOT NULL,
    "sector" BIGINT NOT NULL,
    "provider" BIGINT NOT NULL,
    "client" BIGINT NOT NULL,
    "data" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "term_min" BIGINT NOT NULL,
    "term_max" BIGINT NOT NULL,
    "term_start" BIGINT NOT NULL,
    "status" "SectorStatus",

    CONSTRAINT "datacap_adapter_claim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sector_adapter" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "onChainDealId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sector_adapter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sector_adapter_receipt" (
    "id" UUID NOT NULL,
    "sectorAdapterId" UUID NOT NULL,
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

    CONSTRAINT "sector_adapter_receipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sector_adapter_sector" (
    "id" UUID NOT NULL,
    "sectorAdapterId" UUID NOT NULL,
    "onChainDealId" BIGINT NOT NULL,
    "sectorIndex" BIGINT NOT NULL,
    "sectorNumber" BIGINT NOT NULL,
    "coveredBytes" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sector_adapter_sector_pkey" PRIMARY KEY ("id")
);

-- 3. Migracja danych: deal -> datacap_adapter
INSERT INTO "datacap_adapter" (
    "id", "porepMarketDealId", "onChainDealId",
    "allocationsRequiredCount", "allocationsMatchedCount", "isAllocationsMatched",
    "dataCapAllocationStatus", "allocationIds", "createdAt", "updatedAt"
)
SELECT
    deal."id", deal."id", deal."onChainDealId",
    deal."allocationsRequiredCount", deal."allocationsMatchedCount", deal."isAllocationsMatched",
    deal."dataCapAllocationStatus", deal."allocationIds", deal."createdAt", deal."updatedAt"
FROM "porep_market_deal" deal
WHERE deal."evidenceAdapterType" = 'DataCap'
   OR EXISTS (
       SELECT 1 FROM "porep_market_deal_claim" claim
       WHERE claim."porepMarketDealId" = deal."id"
   );

-- 4. Migracja danych: claims -> datacap_adapter_claim
INSERT INTO "datacap_adapter_claim" (
    "id", "dataCapAdapterId", "claimId", "sector", "provider", "client",
    "data", "size", "term_min", "term_max", "term_start", "status"
)
SELECT
    claim."id", adapter."id", claim."claimId", claim."sector", claim."provider", claim."client",
    claim."data", claim."size", claim."term_min", claim."term_max", claim."term_start", claim."status"
FROM "porep_market_deal_claim" claim
JOIN "datacap_adapter" adapter
  ON adapter."porepMarketDealId" = claim."porepMarketDealId";

-- 5. Indeksy
CREATE UNIQUE INDEX "datacap_adapter_porepMarketDealId_key" ON "datacap_adapter"("porepMarketDealId");
CREATE UNIQUE INDEX "datacap_adapter_onChainDealId_key" ON "datacap_adapter"("onChainDealId");
CREATE INDEX "datacap_adapter_claim_dataCapAdapterId_idx" ON "datacap_adapter_claim"("dataCapAdapterId");
CREATE UNIQUE INDEX "datacap_adapter_claim_claimId_sector_provider_key" ON "datacap_adapter_claim"("claimId", "sector", "provider");

CREATE UNIQUE INDEX "sector_adapter_porepMarketDealId_key" ON "sector_adapter"("porepMarketDealId");
CREATE UNIQUE INDEX "sector_adapter_onChainDealId_key" ON "sector_adapter"("onChainDealId");
CREATE UNIQUE INDEX "sector_adapter_receipt_sectorAdapterId_key" ON "sector_adapter_receipt"("sectorAdapterId");
CREATE UNIQUE INDEX "sector_adapter_receipt_onChainDealId_key" ON "sector_adapter_receipt"("onChainDealId");
CREATE INDEX "sector_adapter_sector_sectorAdapterId_idx" ON "sector_adapter_sector"("sectorAdapterId");
CREATE UNIQUE INDEX "sector_adapter_sector_sectorAdapterId_sectorIndex_key" ON "sector_adapter_sector"("sectorAdapterId", "sectorIndex");

ALTER TABLE "datacap_adapter" ADD CONSTRAINT "datacap_adapter_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "datacap_adapter_claim" ADD CONSTRAINT "datacap_adapter_claim_dataCapAdapterId_fkey" FOREIGN KEY ("dataCapAdapterId") REFERENCES "datacap_adapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sector_adapter" ADD CONSTRAINT "sector_adapter_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sector_adapter_receipt" ADD CONSTRAINT "sector_adapter_receipt_sectorAdapterId_fkey" FOREIGN KEY ("sectorAdapterId") REFERENCES "sector_adapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sector_adapter_sector" ADD CONSTRAINT "sector_adapter_sector_sectorAdapterId_fkey" FOREIGN KEY ("sectorAdapterId") REFERENCES "sector_adapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "porep_market_deal_claim";

ALTER TABLE "porep_market_deal"
  DROP COLUMN "allocationsRequiredCount",
  DROP COLUMN "allocationsMatchedCount",
  DROP COLUMN "isAllocationsMatched",
  DROP COLUMN "dataCapAllocationStatus",
  DROP COLUMN "allocationIds";