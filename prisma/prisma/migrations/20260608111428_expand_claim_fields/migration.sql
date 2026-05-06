/*
  Warnings:

  - Added the required column `client` to the `porep_market_deal_claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `data` to the `porep_market_deal_claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider` to the `porep_market_deal_claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `porep_market_deal_claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `term_max` to the `porep_market_deal_claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `term_min` to the `porep_market_deal_claim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `term_start` to the `porep_market_deal_claim` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "porep_market_deal_claim" ADD COLUMN     "client" BIGINT NOT NULL,
ADD COLUMN     "data" TEXT NOT NULL,
ADD COLUMN     "provider" BIGINT NOT NULL,
ADD COLUMN     "size" BIGINT NOT NULL,
ADD COLUMN     "term_max" BIGINT NOT NULL,
ADD COLUMN     "term_min" BIGINT NOT NULL,
ADD COLUMN     "term_start" BIGINT NOT NULL;
