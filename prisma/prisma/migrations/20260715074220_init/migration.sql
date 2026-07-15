-- CreateEnum
CREATE TYPE "SectorStatus" AS ENUM ('Dead', 'Active', 'Faulty');

-- CreateEnum
CREATE TYPE "DealState" AS ENUM ('None', 'Proposed', 'Accepted', 'Active', 'Finalized', 'Rejected', 'Expired', 'Terminated');

-- CreateEnum
CREATE TYPE "DataCapAllocationStatus" AS ENUM ('None', 'Allocated', 'Claimed', 'Inactive');

-- CreateEnum
CREATE TYPE "EvidenceResult" AS ENUM ('None', 'Partial', 'Accepted', 'Rejected', 'Active', 'Inactive', 'CoveredBytesMismatch');

-- CreateEnum
CREATE TYPE "ContractName" AS ENUM ('PoRepMarket', 'Client', 'SliOracle', 'SliScorer', 'SpRegistry', 'Validator', 'FilecoinPay');

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
    "bandwidthBytesPerSecond" BIGINT NOT NULL,
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
    "requestedSizeBytes" BIGINT NOT NULL,
    "durationEpochs" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "porep_market_deal_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "porep_market_deal_payment" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "onChainDealId" BIGINT NOT NULL,
    "paymentToken" TEXT NOT NULL,
    "pricePer32GiBPerMonth" BIGINT NOT NULL,
    "billed32GiBUnits" BIGINT NOT NULL,
    "railMaxRatePerEpoch" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "porep_market_deal_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "porep_market_deal_evidence_status" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "onChainDealId" BIGINT NOT NULL,
    "activeCoveredBytes" BIGINT NOT NULL,
    "lastEvidenceRefreshEpoch" BIGINT NOT NULL,
    "reasonCode" BIGINT NOT NULL,
    "result" "EvidenceResult" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "porep_market_deal_evidence_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "porep_market_deal_claim" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
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

    CONSTRAINT "porep_market_deal_claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "porep_market_deal" (
    "id" UUID NOT NULL,
    "onChainDealId" BIGINT NOT NULL,
    "client" TEXT NOT NULL,
    "provider" BIGINT NOT NULL,
    "offerId" BIGINT,
    "railId" BIGINT NOT NULL,
    "evidenceAdapterContractAddress" TEXT NOT NULL,
    "validatorContractAddress" TEXT NOT NULL,
    "providerOrganization" TEXT,
    "state" "DealState" NOT NULL,
    "manifestHash" TEXT,
    "manifestLocation" TEXT,
    "expiresAtEpoch" BIGINT,
    "serviceStartEpoch" BIGINT,
    "serviceEndEpoch" BIGINT,
    "reservedBytes" BIGINT,
    "committedBytes" BIGINT,
    "allocationsRequiredCount" BIGINT,
    "allocationsMatchedCount" BIGINT,
    "isAllocationsMatched" BOOLEAN NOT NULL,
    "dataCapAllocationStatus" "DataCapAllocationStatus" NOT NULL DEFAULT 'None',
    "isRailTerminated" BOOLEAN NOT NULL,
    "dealStartEpoch" BIGINT,
    "dealEndEpoch" BIGINT,
    "allocationIds" BIGINT[],
    "proposedAtEpoch" BIGINT NOT NULL,
    "activatePaymentAt" TIMESTAMP(3),
    "urlFinderSliTargetTriggeredAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "porep_market_deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "porep_market_deal_settlement_history" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "epoch" BIGINT NOT NULL,
    "settlementAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "porep_market_deal_settlement_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "porep_market_deal_score" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "calculatedScore" BIGINT NOT NULL,
    "averageRetrievabilityBps" BIGINT NOT NULL,
    "averageBandwidthMbps" BIGINT NOT NULL,
    "averageLatencyMs" BIGINT NOT NULL,
    "averageIndexingPct" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "porep_market_deal_score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "porep_market_deal_on_chain_transaction" (
    "id" UUID NOT NULL,
    "porepMarketDealId" UUID NOT NULL,
    "contractName" "ContractName" NOT NULL,
    "functionName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "porep_market_deal_on_chain_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "porep_market_deal_on_chain_transaction_detail" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "gasUsed" BIGINT,
    "gasPrice" BIGINT,
    "nonce" BIGINT,
    "fromAddress" TEXT,
    "toAddress" TEXT,
    "value" BIGINT,
    "inputData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "porep_market_deal_on_chain_transaction_detail_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "porep_market_deal_payment_porepMarketDealId_key" ON "porep_market_deal_payment"("porepMarketDealId");

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_payment_onChainDealId_key" ON "porep_market_deal_payment"("onChainDealId");

-- CreateIndex
CREATE INDEX "porep_market_deal_payment_porepMarketDealId_idx" ON "porep_market_deal_payment"("porepMarketDealId");

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_evidence_status_porepMarketDealId_key" ON "porep_market_deal_evidence_status"("porepMarketDealId");

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_evidence_status_onChainDealId_key" ON "porep_market_deal_evidence_status"("onChainDealId");

-- CreateIndex
CREATE INDEX "porep_market_deal_evidence_status_porepMarketDealId_idx" ON "porep_market_deal_evidence_status"("porepMarketDealId");

-- CreateIndex
CREATE INDEX "porep_market_deal_claim_porepMarketDealId_idx" ON "porep_market_deal_claim"("porepMarketDealId");

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_claim_claimId_sector_provider_key" ON "porep_market_deal_claim"("claimId", "sector", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_onChainDealId_key" ON "porep_market_deal"("onChainDealId");

-- CreateIndex
CREATE INDEX "porep_market_deal_onChainDealId_idx" ON "porep_market_deal"("onChainDealId");

-- CreateIndex
CREATE INDEX "porep_market_deal_state_idx" ON "porep_market_deal"("state");

-- CreateIndex
CREATE INDEX "porep_market_deal_provider_idx" ON "porep_market_deal"("provider");

-- CreateIndex
CREATE INDEX "porep_market_deal_settlement_history_porepMarketDealId_idx" ON "porep_market_deal_settlement_history"("porepMarketDealId");

-- CreateIndex
CREATE INDEX "porep_market_deal_on_chain_transaction_porepMarketDealId_idx" ON "porep_market_deal_on_chain_transaction"("porepMarketDealId");

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_on_chain_transaction_detail_transactionId_key" ON "porep_market_deal_on_chain_transaction_detail"("transactionId");

-- AddForeignKey
ALTER TABLE "porep_market_deal_history" ADD CONSTRAINT "porep_market_deal_history_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porep_market_deal_requirement" ADD CONSTRAINT "porep_market_deal_requirement_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porep_market_deal_terms" ADD CONSTRAINT "porep_market_deal_terms_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porep_market_deal_payment" ADD CONSTRAINT "porep_market_deal_payment_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porep_market_deal_evidence_status" ADD CONSTRAINT "porep_market_deal_evidence_status_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porep_market_deal_claim" ADD CONSTRAINT "porep_market_deal_claim_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porep_market_deal_settlement_history" ADD CONSTRAINT "porep_market_deal_settlement_history_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porep_market_deal_score" ADD CONSTRAINT "porep_market_deal_score_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porep_market_deal_on_chain_transaction" ADD CONSTRAINT "porep_market_deal_on_chain_transaction_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porep_market_deal_on_chain_transaction_detail" ADD CONSTRAINT "porep_market_deal_on_chain_transaction_detail_transactionI_fkey" FOREIGN KEY ("transactionId") REFERENCES "porep_market_deal_on_chain_transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
