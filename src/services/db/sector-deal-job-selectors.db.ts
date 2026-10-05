import { EvidenceAdapterType } from "../../../prisma/generated/client";
import { DealState } from "../../utils/types";
import { getDealsByWhereFromDb } from "./deal-job-selectors.db";
import { PorepMarketDealDto } from "./dto/porep-market-deal.dto";

export async function getSectorDealsToActivateEvidenceFromDb(): Promise<
  PorepMarketDealDto[]
> {
  return await getDealsByWhereFromDb({
    evidenceAdapterType: EvidenceAdapterType.Sector,
    state: DealState.Accepted,
    isRailTerminated: false,
    railId: {
      gt: 0,
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
