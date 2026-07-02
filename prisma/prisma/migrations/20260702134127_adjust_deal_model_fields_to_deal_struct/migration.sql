/*
  Warnings:

  - You are about to drop the column `dealSizeBytes` on the `porep_market_deal_terms` table. All the data in the column will be lost.
  - You are about to drop the column `durationDays` on the `porep_market_deal_terms` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerSectorPerMonth` on the `porep_market_deal_terms` table. All the data in the column will be lost.
  - Added the required column `durationEpochs` to the `porep_market_deal_terms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricePer32GiBPerMonth` to the `porep_market_deal_terms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requestedSizeBytes` to the `porep_market_deal_terms` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "porep_market_deal_terms" DROP COLUMN "dealSizeBytes",
DROP COLUMN "durationDays",
DROP COLUMN "pricePerSectorPerMonth",
ADD COLUMN     "durationEpochs" BIGINT NOT NULL,
ADD COLUMN     "pricePer32GiBPerMonth" BIGINT NOT NULL,
ADD COLUMN     "requestedSizeBytes" BIGINT NOT NULL;
