import { EvidenceAdapterType } from "../../../prisma/generated/client";
import { DealState } from "../../utils/types";
import { prismaClient } from "./db-client";
import { getDealsByWhereFromDb } from "./deal-job-selectors.db";
import { DataCapAllocationStatus } from "./deal-status.db";
import { PorepMarketDealDto } from "./dto/porep-market-deal.dto";

export async function getDataCapDealsToCheckClaimTerminationFromDb() {
  const deals = await prismaClient.porep_market_deal.findMany({
    where: {
      evidenceAdapterType: EvidenceAdapterType.DataCap,
      dealEndEpoch: {
        not: null,
      },
      state: DealState.Active,
      isRailTerminated: false,
      dataCapEvidence: {
        is: {
          isAllocationsMatched: true, // IMPORTANT: only consider deals with matching allocation count between expected and actual to avoid setting wrong deal end epoch
        },
      },
    },
    include: {
      dataCapEvidence: {
        include: {
          claims: true,
        },
      },
    },
  });

  return deals ? deals : [];
}

export async function getDataCapDealsToRefreshEvidenceStatusFromDb(): Promise<
  PorepMarketDealDto[]
> {
  return await getDealsByWhereFromDb({
    evidenceAdapterType: EvidenceAdapterType.DataCap,
    state: DealState.Active,
    dataCapEvidence: {
      is: {
        isAllocationsMatched: true,
      },
    },
    isRailTerminated: false,
    activatePaymentAt: {
      not: null,
    },
  });
}

export async function getDataCapDealsToActivateEvidenceFromDb(): Promise<
  PorepMarketDealDto[]
> {
  return await getDealsByWhereFromDb({
    evidenceAdapterType: EvidenceAdapterType.DataCap,
    dataCapEvidence: {
      is: {
        dataCapAllocationStatus: DataCapAllocationStatus.Allocated,
      },
    },
    state: DealState.Accepted,
    isRailTerminated: false,
  });
}
