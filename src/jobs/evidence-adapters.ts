import { EvidenceAdapterType } from "../../prisma/generated/client";
import {
  DealEvidenceSyncData,
  PorepMarketContractDealView,
} from "../utils/types";
import { prepareDataCapDealEvidenceForSync } from "./datacap/datacap-deal-sync";
import { prepareSectorDealEvidenceForSync } from "./sector/sector-deal-sync";
import { getDealsFromDb } from "../services/db/db-service";

type ExistingDeal = Awaited<ReturnType<typeof getDealsFromDb>>[number];

export interface DealEvidenceAdapter {
  type: EvidenceAdapterType;
  prepareEvidenceForSync: (
    dealView: PorepMarketContractDealView,
    existingDeal?: ExistingDeal,
  ) => Promise<DealEvidenceSyncData>;
}

const dataCapAdapter: DealEvidenceAdapter = {
  type: EvidenceAdapterType.DataCap,
  prepareEvidenceForSync: (dealView, existingDeal) =>
    prepareDataCapDealEvidenceForSync(
      dealView,
      existingDeal?.dataCapAdapter?.isAllocationsMatched,
    ),
};

const sectorAdapter: DealEvidenceAdapter = {
  type: EvidenceAdapterType.Sector,
  prepareEvidenceForSync: (dealView, existingDeal) =>
    prepareSectorDealEvidenceForSync(
      dealView,
      existingDeal?.sectorAdapter?.receipt?.sectorCount,
    ),
};

const evidenceAdapters = new Map<EvidenceAdapterType, DealEvidenceAdapter>(
  [dataCapAdapter, sectorAdapter].map((adapter) => [adapter.type, adapter]),
);

export function getEvidenceAdapter(type: EvidenceAdapterType) {
  const adapter = evidenceAdapters.get(type);

  if (!adapter) {
    throw new Error(`Unsupported evidence adapter type: ${type}`);
  }

  return adapter;
}
