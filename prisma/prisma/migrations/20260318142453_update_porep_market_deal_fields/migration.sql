/*
  Warnings:

  - Added the required column `allocationsCount` to the `porep_market_deal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `railTerminated` to the `porep_market_deal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `validatorContractAddress` to the `porep_market_deal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "porep_market_deal" ADD COLUMN     "allocationsCount" BIGINT NOT NULL,
ADD COLUMN     "railTerminated" BOOLEAN NOT NULL,
ADD COLUMN     "validatorContractAddress" TEXT NOT NULL;
