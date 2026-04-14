-- CreateEnum
CREATE TYPE "DealState" AS ENUM ('Proposed', 'Accepted', 'Completed', 'Rejected', 'Terminated');

-- CreateTable
CREATE TABLE "porep_market_deal_history" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "state" "DealState" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "porep_market_deal_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "porep_market_deal_requirement" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "onChainDealId" BIGINT NOT NULL,
    "retrievabilityBps" BIGINT NOT NULL,
    "bandwidthMbps" BIGINT NOT NULL,
    "latencyMs" BIGINT NOT NULL,
    "indexingPct" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "porep_market_deal_requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "porep_market_deal_terms" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "onChainDealId" BIGINT NOT NULL,
    "dealSizeBytes" BIGINT NOT NULL,
    "pricePerSectorPerMonth" BIGINT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "porep_market_deal_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "porep_market_deal" (
    "id" UUID NOT NULL,
    "onChainDealId" BIGINT NOT NULL,
    "client" TEXT NOT NULL,
    "provider" BIGINT NOT NULL,
    "railId" BIGINT NOT NULL,
    "validatorContractAddress" TEXT NOT NULL,
    "state" "DealState" NOT NULL,
    "allocationsRequiredCount" BIGINT,
    "allocationsMatchedCount" BIGINT,
    "isAllocationsMatched" BOOLEAN NOT NULL,
    "isRailTerminated" BOOLEAN NOT NULL,
    "dealStartEpoch" BIGINT,
    "dealEndEpoch" BIGINT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "porep_market_deal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "porep_market_deal_history_porepMarketDealId_idx" ON "porep_market_deal_history"("porepMarketDealId");

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_requirement_porepMarketDealId_key" ON "porep_market_deal_requirement"("porepMarketDealId");

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_requirement_onChainDealId_key" ON "porep_market_deal_requirement"("onChainDealId");

-- CreateIndex
CREATE INDEX "porep_market_deal_requirement_porepMarketDealId_idx" ON "porep_market_deal_requirement"("porepMarketDealId");

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_terms_porepMarketDealId_key" ON "porep_market_deal_terms"("porepMarketDealId");

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_terms_onChainDealId_key" ON "porep_market_deal_terms"("onChainDealId");

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_onChainDealId_key" ON "porep_market_deal"("onChainDealId");

-- CreateIndex
CREATE INDEX "porep_market_deal_onChainDealId_idx" ON "porep_market_deal"("onChainDealId");

-- CreateIndex
CREATE INDEX "porep_market_deal_state_idx" ON "porep_market_deal"("state");

-- CreateIndex
CREATE INDEX "porep_market_deal_provider_idx" ON "porep_market_deal"("provider");

-- AddForeignKey
ALTER TABLE "porep_market_deal_history" ADD CONSTRAINT "porep_market_deal_history_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porep_market_deal_requirement" ADD CONSTRAINT "porep_market_deal_requirement_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porep_market_deal_terms" ADD CONSTRAINT "porep_market_deal_terms_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
