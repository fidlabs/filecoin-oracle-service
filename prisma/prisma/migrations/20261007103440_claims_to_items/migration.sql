ALTER TABLE "porep_market_deal_evidence_status"
  RENAME COLUMN "checkedClaims" TO "checkedItems";

ALTER TABLE "porep_market_deal_evidence_status"
  RENAME COLUMN "totalClaims" TO "totalItems";
