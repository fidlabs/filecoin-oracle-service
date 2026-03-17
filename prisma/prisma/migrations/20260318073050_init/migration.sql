-- CreateTable
CREATE TABLE "porep_market_deal" (
    "id" UUID NOT NULL,
    "dealId" BIGINT NOT NULL,
    "client" TEXT NOT NULL,
    "provider" BIGINT NOT NULL,
    "railId" BIGINT NOT NULL,
    "deal_start_epoch" BIGINT NOT NULL,
    "deal_end_epoch" BIGINT NOT NULL,

    CONSTRAINT "porep_market_deal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_dealId_key" ON "porep_market_deal"("dealId");

-- CreateIndex
CREATE INDEX "porep_market_deal_dealId_idx" ON "porep_market_deal"("dealId");

-- CreateIndex
CREATE INDEX "porep_market_deal_provider_idx" ON "porep_market_deal"("provider");
