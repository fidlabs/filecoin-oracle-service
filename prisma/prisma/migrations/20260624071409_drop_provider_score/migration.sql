/*
  Warnings:

  - You are about to drop the column `bandwidthMbps` on the `porep_market_deal_requirement` table. All the data in the column will be lost.
  - You are about to drop the `porep_market_deal_provider_score` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `bandwidthBytesPerSecond` to the `porep_market_deal_requirement` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "porep_market_deal_provider_score" DROP CONSTRAINT "porep_market_deal_provider_score_porepMarketDealId_fkey";

-- AlterTable
ALTER TABLE "porep_market_deal_requirement" DROP COLUMN "bandwidthMbps",
ADD COLUMN     "bandwidthBytesPerSecond" BIGINT NOT NULL;

-- DropTable
DROP TABLE "porep_market_deal_provider_score";

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

-- AddForeignKey
ALTER TABLE "porep_market_deal_score" ADD CONSTRAINT "porep_market_deal_score_porepMarketDealId_fkey" FOREIGN KEY ("porepMarketDealId") REFERENCES "porep_market_deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
