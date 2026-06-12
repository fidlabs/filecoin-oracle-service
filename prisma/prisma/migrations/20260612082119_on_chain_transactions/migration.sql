-- CreateEnum
CREATE TYPE "ContractName" AS ENUM ('PoRepMarket', 'Client', 'SliOracle', 'SliScorer', 'SpRegistry', 'Validator', 'FilecoinPay');

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
CREATE INDEX "porep_market_deal_on_chain_transaction_porepMarketDealId_idx" ON "porep_market_deal_on_chain_transaction"("porepMarketDealId");

-- CreateIndex
CREATE UNIQUE INDEX "porep_market_deal_on_chain_transaction_detail_transactionId_key" ON "porep_market_deal_on_chain_transaction_detail"("transactionId");

-- AddForeignKey
ALTER TABLE "porep_market_deal_on_chain_transaction" ADD CONSTRAINT "porep_market_deal_on_chain_transaction_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "porep_market_deal_on_chain_transaction_detail" ADD CONSTRAINT "porep_market_deal_on_chain_transaction_detail_transactionI_fkey" FOREIGN KEY ("transactionId") REFERENCES "porep_market_deal_on_chain_transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
