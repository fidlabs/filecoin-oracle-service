/*
  Warnings:

  - Added the required column `averageBandwidthMbps` to the `porep_market_deal_provider_score` table without a default value. This is not possible if the table is not empty.
  - Added the required column `averageIndexingPct` to the `porep_market_deal_provider_score` table without a default value. This is not possible if the table is not empty.
  - Added the required column `averageLatencyMs` to the `porep_market_deal_provider_score` table without a default value. This is not possible if the table is not empty.
  - Added the required column `averageRetrievabilityBps` to the `porep_market_deal_provider_score` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "porep_market_deal_provider_score" ADD COLUMN     "averageBandwidthMbps" BIGINT NOT NULL,
ADD COLUMN     "averageIndexingPct" BIGINT NOT NULL,
ADD COLUMN     "averageLatencyMs" BIGINT NOT NULL,
ADD COLUMN     "averageRetrievabilityBps" BIGINT NOT NULL;
