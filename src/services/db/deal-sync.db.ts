import { Prisma } from "../../../prisma/generated/client";
import {
  DealEvidenceStatus,
  DealPayment,
  DealTerms,
  PorepMarketDeal,
  PorepMarketDealDataCapEvidence,
  PorepMarketDealClaim,
  PorepMarketDealSector,
  SectorManifestReceipt,
  SLIThresholds,
} from "../../utils/types";
import { prismaClient } from "./db-client";

const SYNC_DEALS_DB_BATCH_SIZE = 100;

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

const hasMatchedAllocations = ({
  allocationsRequiredCount,
  allocationsMatchedCount,
}: PorepMarketDealDataCapEvidence) =>
  allocationsRequiredCount !== undefined &&
  allocationsRequiredCount !== null &&
  allocationsMatchedCount !== undefined &&
  allocationsMatchedCount !== null &&
  allocationsRequiredCount === allocationsMatchedCount;

const buildClaimPersistenceData = (claim: PorepMarketDealClaim) => ({
  claimId: claim.claimId,
  sector: claim.sector,
  provider: claim.provider,
  client: claim.client,
  data: claim.data,
  size: claim.size,
  term_min: claim.term_min,
  term_max: claim.term_max,
  term_start: claim.term_start,
  // don't map the status field - is updated by the separately job
});

const buildDealPersistenceData = (deal: PorepMarketDeal) => ({
  onChainDealId: deal.dealId,
  client: deal.client,
  provider: deal.provider,
  offerId: deal.offerId,
  railId: deal.railId,
  evidenceAdapterContractAddress: deal.evidenceAdapterContractAddress,
  evidenceAdapterType: deal.evidenceAdapterType,
  isEvidenceComplete: deal.isEvidenceComplete,
  validatorContractAddress: deal.validatorContractAddress,
  providerOrganization: deal.providerOrganization,
  state: deal.state,
  manifestHash: deal.manifestHash,
  manifestLocation: deal.manifestLocation,
  expiresAtEpoch: deal.expiresAtEpoch,
  serviceStartEpoch: deal.serviceStartEpoch,
  serviceEndEpoch: deal.serviceEndEpoch,
  earlyTerminationEpoch: deal.earlyTerminationEpoch,
  minTimeBetweenSettlementsInEpochs: deal.minTimeBetweenSettlementsInEpochs,
  lastSettledEpoch: deal.lastSettledEpoch,
  reservedBytes: deal.reservedBytes,
  committedBytes: deal.committedBytes,
  dealType: deal.dealType,
  dealStartEpoch: deal.dealStartEpoch,
  dealEndEpoch: deal.dealEndEpoch,
  proposedAtEpoch: deal.proposedAtEpoch,
});

const buildDealCreateData = (deal: PorepMarketDeal) => ({
  ...buildDealPersistenceData(deal),
  history: {
    create: {
      state: deal.state,
    },
  },
  isRailTerminated: false,
});

const buildDealUpdateData = (deal: PorepMarketDeal) => ({
  ...buildDealPersistenceData(deal),
  isRailTerminated: deal.isRailTerminated,
  lastSyncedAt: new Date(),
});

async function upsertDealTerms({
  tx,
  onChainDealId,
  porepMarketDealId,
  terms,
}: {
  tx: Prisma.TransactionClient;
  onChainDealId: bigint;
  porepMarketDealId: string;
  terms: DealTerms;
}) {
  return tx.porep_market_deal_terms.upsert({
    where: {
      porepMarketDealId,
    },
    create: {
      porepMarketDealId,
      onChainDealId,
      ...terms,
    },
    update: terms,
  });
}

async function upsertDealPayment({
  tx,
  onChainDealId,
  porepMarketDealId,
  payment,
}: {
  tx: Prisma.TransactionClient;
  onChainDealId: bigint;
  porepMarketDealId: string;
  payment: DealPayment;
}) {
  return tx.porep_market_deal_payment.upsert({
    where: {
      porepMarketDealId,
    },
    create: {
      porepMarketDealId,
      onChainDealId,
      ...payment,
    },
    update: payment,
  });
}

async function upsertDealEvidenceStatus({
  tx,
  onChainDealId,
  porepMarketDealId,
  evidenceStatus,
}: {
  tx: Prisma.TransactionClient;
  onChainDealId: bigint;
  porepMarketDealId: string;
  evidenceStatus: DealEvidenceStatus;
}) {
  return tx.porep_market_deal_evidence_status.upsert({
    where: {
      porepMarketDealId,
    },
    create: {
      porepMarketDealId,
      onChainDealId,
      ...evidenceStatus,
    },
    update: evidenceStatus,
  });
}

async function upsertDealRequirements({
  tx,
  onChainDealId,
  porepMarketDealId,
  requiredSLIs,
}: {
  tx: Prisma.TransactionClient;
  onChainDealId: bigint;
  porepMarketDealId: string;
  requiredSLIs: SLIThresholds;
}) {
  return tx.porep_market_deal_requirement.upsert({
    where: {
      porepMarketDealId,
    },
    create: {
      porepMarketDealId,
      onChainDealId,
      ...requiredSLIs,
    },
    update: requiredSLIs,
  });
}

async function upsertDataCapEvidence({
  tx,
  onChainDealId,
  porepMarketDealId,
  dataCapEvidence,
}: {
  tx: Prisma.TransactionClient;
  onChainDealId: bigint;
  porepMarketDealId: string;
  dataCapEvidence?: PorepMarketDealDataCapEvidence;
}) {
  if (!dataCapEvidence) return null;

  return tx.porep_market_deal_datacap_evidence.upsert({
    where: {
      porepMarketDealId,
    },
    create: {
      porepMarketDealId,
      onChainDealId,
      allocationsRequiredCount: dataCapEvidence.allocationsRequiredCount,
      allocationsMatchedCount: dataCapEvidence.allocationsMatchedCount,
      isAllocationsMatched: hasMatchedAllocations(dataCapEvidence),
      dataCapAllocationStatus: dataCapEvidence.dataCapAllocationStatus,
      allocationIds: dataCapEvidence.allocationIds ?? [],
    },
    update: {
      allocationsRequiredCount: dataCapEvidence.allocationsRequiredCount,
      allocationsMatchedCount: dataCapEvidence.allocationsMatchedCount,
      isAllocationsMatched:
        dataCapEvidence.allocationsRequiredCount !== undefined &&
        dataCapEvidence.allocationsMatchedCount !== undefined
          ? hasMatchedAllocations(dataCapEvidence)
          : undefined,
      dataCapAllocationStatus: dataCapEvidence.dataCapAllocationStatus,
      allocationIds: dataCapEvidence.allocationIds,
    },
  });
}

async function syncDealClaims({
  tx,
  dataCapEvidenceId,
  claims,
}: {
  tx: Prisma.TransactionClient;
  dataCapEvidenceId?: string;
  claims?: PorepMarketDealClaim[];
}) {
  if (!dataCapEvidenceId || !claims?.length) return;

  await tx.porep_market_deal_claim.createMany({
    data: claims.map((claim) => ({
      dataCapEvidenceId,
      ...buildClaimPersistenceData(claim),
    })),
    skipDuplicates: true,
  });
}

async function upsertDealSectorReceipt({
  tx,
  onChainDealId,
  porepMarketDealId,
  sectorReceipt,
}: {
  tx: Prisma.TransactionClient;
  onChainDealId: bigint;
  porepMarketDealId: string;
  sectorReceipt?: SectorManifestReceipt;
}) {
  if (!sectorReceipt) return;

  await tx.porep_market_deal_sector_receipt.upsert({
    where: {
      porepMarketDealId,
    },
    create: {
      porepMarketDealId,
      onChainDealId,
      ...sectorReceipt,
    },
    update: sectorReceipt,
  });
}

async function syncDealSectors({
  tx,
  onChainDealId,
  porepMarketDealId,
  sectors,
}: {
  tx: Prisma.TransactionClient;
  onChainDealId: bigint;
  porepMarketDealId: string;
  sectors?: PorepMarketDealSector[];
}) {
  if (!sectors?.length) return;

  await tx.porep_market_deal_sector.createMany({
    data: sectors.map((sector) => ({
      porepMarketDealId,
      onChainDealId,
      ...sector,
    })),
    skipDuplicates: true,
  });
}

async function syncDealRelations({
  tx,
  deals,
  dealsMap,
}: {
  tx: Prisma.TransactionClient;
  deals: PorepMarketDeal[];
  dealsMap: Map<string, { id: string }>;
}) {
  for (const deal of deals) {
    const porepMarketDealId = dealsMap.get(deal.dealId.toString())!.id;
    const dataCapEvidence = await upsertDataCapEvidence({
      tx,
      onChainDealId: deal.dealId,
      porepMarketDealId,
      dataCapEvidence: deal.dataCapEvidence,
    });

    await Promise.all([
      upsertDealTerms({
        tx,
        onChainDealId: deal.dealId,
        porepMarketDealId,
        terms: deal.terms,
      }),
      upsertDealPayment({
        tx,
        onChainDealId: deal.dealId,
        payment: deal.payment,
        porepMarketDealId,
      }),
      upsertDealEvidenceStatus({
        tx,
        onChainDealId: deal.dealId,
        evidenceStatus: deal.evidenceStatus,
        porepMarketDealId,
      }),
      upsertDealRequirements({
        tx,
        onChainDealId: deal.dealId,
        requiredSLIs: deal.requiredSLIs,
        porepMarketDealId,
      }),
      syncDealClaims({
        tx,
        dataCapEvidenceId: dataCapEvidence?.id,
        claims: deal.dataCapEvidence?.claims,
      }),
      upsertDealSectorReceipt({
        tx,
        onChainDealId: deal.dealId,
        porepMarketDealId,
        sectorReceipt: deal.sectorReceipt,
      }),
      syncDealSectors({
        tx,
        onChainDealId: deal.dealId,
        porepMarketDealId,
        sectors: deal.sectors,
      }),
    ]);
  }
}

export async function syncPoRepMarketContractDealsWithDb(
  deals: PorepMarketDeal[],
) {
  if (!deals.length) return;

  for (const batch of chunkArray(deals, SYNC_DEALS_DB_BATCH_SIZE)) {
    await syncPoRepMarketContractDealsBatchWithDb(batch);
  }
}

async function syncPoRepMarketContractDealsBatchWithDb(
  deals: PorepMarketDeal[],
) {
  return prismaClient.$transaction(
    async (tx) => {
      const existing = await tx.porep_market_deal.findMany({
        where: {
          onChainDealId: {
            in: deals.map((d) => d.dealId),
          },
        },
        select: {
          id: true,
          onChainDealId: true,
          state: true,
        },
      });

      const existingDealsMap = new Map(
        existing.map((dbDeals) => [dbDeals.onChainDealId.toString(), dbDeals]),
      );

      const upserted = await Promise.all(
        deals.map((deal) =>
          tx.porep_market_deal.upsert({
            where: {
              onChainDealId: deal.dealId,
            },
            create: buildDealCreateData(deal),
            update: buildDealUpdateData(deal),
          }),
        ),
      );

      const allUpsertedDealsMap = new Map(
        upserted.map((dbDeals) => [dbDeals.onChainDealId.toString(), dbDeals]),
      );

      const allDBDealsMap = new Map([
        ...existingDealsMap,
        ...allUpsertedDealsMap,
      ]);

      await syncDealRelations({
        tx,
        deals,
        dealsMap: allDBDealsMap,
      });

      const historyRows = deals
        .map((d) => {
          const prev = existingDealsMap.get(d.dealId.toString());
          if (!prev) return null;

          if (prev.state === d.state) return null;

          return {
            porepMarketDealId: prev.id,
            state: d.state,
          };
        })
        .filter(Boolean) as {
        porepMarketDealId: string;
        state: never;
      }[];

      if (historyRows.length > 0) {
        await tx.porep_market_deal_history.createMany({
          data: historyRows,
        });
      }

      return;
    },
    {
      timeout: 1 * 60 * 1000,
    },
  );
}
