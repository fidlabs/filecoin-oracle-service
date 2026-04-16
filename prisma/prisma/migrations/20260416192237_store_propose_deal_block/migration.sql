/*
  Warnings:

  - Added the required column `proposedAtBlock` to the `porep_market_deal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "porep_market_deal" ADD COLUMN     "proposedAtBlock" BIGINT NOT NULL;
