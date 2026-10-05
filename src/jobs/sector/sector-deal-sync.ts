import {
  getManifestReceiptFromSectorEvidenceContract,
  getSectorsFromSectorEvidenceContract,
} from "../../blockchain/sector-evidence-adapter-contract";
import { baseLogger } from "../../utils/logger";
import {
  DealEvidenceSyncData,
  PorepMarketContractDealView,
  PorepMarketDealSector,
} from "../../utils/types";

const sectorDealSyncLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Sync Deal Job][Sector] " },
);

export async function prepareSectorDealEvidenceForSync(
  dealView: PorepMarketContractDealView,
  syncedSectorCount = 0n,
): Promise<DealEvidenceSyncData> {
  const { deal } = dealView;
  const dealId = deal.dealId;

  const sectorReceipt = await getManifestReceiptFromSectorEvidenceContract(
    dealId,
    deal.evidenceAdapter,
  );

  let sectors: PorepMarketDealSector[] = [];

  if (sectorReceipt.sectorCount > syncedSectorCount) {
    sectors = await getSectorsFromSectorEvidenceContract(
      dealId,
      deal.evidenceAdapter,
      syncedSectorCount,
      sectorReceipt.sectorCount,
    );
  }

  const isEvidenceComplete =
    sectorReceipt.pieceCount > 0n &&
    sectorReceipt.acceptedPieceCount === sectorReceipt.pieceCount &&
    sectorReceipt.acceptedBytes === dealView.terms.requestedSizeBytes;

  sectorDealSyncLogger.info(
    `Deal ${dealId}: ${sectorReceipt.acceptedPieceCount}/${sectorReceipt.pieceCount} pieces placed in ${sectorReceipt.sectorCount} sectors (${sectors.length} new), evidence complete: ${isEvidenceComplete}`,
  );

  return {
    isEvidenceComplete,
    sectorReceipt,
    sectors,
  };
}
