import { EvidenceAdapterType } from "../../../prisma/generated/client";
import { DealState } from "../../utils/types";
import { prismaClient } from "./db-client";
import { getDealsByWhereFromDb } from "./deal-job-selectors.db";
import { PorepMarketDealDto } from "./dto/porep-market-deal.dto";

export async function getSectorDealsToActivateEvidenceFromDb(): Promise<
  PorepMarketDealDto[]
> {
  const rows = await prismaClient.$queryRaw<{ onChainDealId: bigint }[]>`
    SELECT deal."onChainDealId"
    FROM "porep_market_deal" deal
    JOIN "porep_market_deal_terms" terms
      ON terms."porepMarketDealId" = deal.id
    JOIN "sector_adapter" sector_adapter
      ON sector_adapter."porepMarketDealId" = deal.id
    JOIN "sector_adapter_receipt" receipt
      ON receipt."sectorAdapterId" = sector_adapter.id
    WHERE deal."evidenceAdapterType" = ${EvidenceAdapterType.Sector}::"EvidenceAdapterType"
      AND deal.state = ${DealState.Accepted}::"DealState"
      AND deal."isEvidenceComplete" = true
      AND deal."isRailTerminated" = false
      AND receipt.activated = false
      AND receipt."pieceCount" > 0
      AND receipt."acceptedPieceCount" = receipt."pieceCount"
      AND receipt."acceptedBytes" = terms."requestedSizeBytes"
  `;

  if (!rows.length) return [];

  return await getDealsByWhereFromDb({
    onChainDealId: {
      in: rows.map((row) => row.onChainDealId),
    },
  });
}

export async function getSectorDealsToRefreshEvidenceStatusFromDb(): Promise<
  PorepMarketDealDto[]
> {
  return await getDealsByWhereFromDb({
    evidenceAdapterType: EvidenceAdapterType.Sector,
    state: DealState.Active,
    isEvidenceComplete: true,
    isRailTerminated: false,
  });
}
