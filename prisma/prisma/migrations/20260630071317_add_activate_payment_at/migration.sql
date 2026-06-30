/*
  Warnings:

  - You are about to drop the column `isDealEndEpochSetOnChain` on the `porep_market_deal` table. All the data in the column will be lost.
  - You are about to drop the column `modifyRailPaymentAt` on the `porep_market_deal` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "porep_market_deal" DROP COLUMN "isDealEndEpochSetOnChain",
DROP COLUMN "modifyRailPaymentAt",
ADD COLUMN     "activatePaymentAt" TIMESTAMP(3);
