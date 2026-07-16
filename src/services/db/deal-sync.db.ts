import { Prisma } from "../../../prisma/generated/client";
import {
  DealEvidenceStatus,
  DealPayment,
  DealTerms,
  PorepMarketDeal,
  PorepMarketDealClaim,
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
}: {
  allocationsRequiredCount?: bigint;
  allocationsMatchedCount?: bigint;
}) =>
  allocationsRequiredCount !== undefined &&
  allocationsRequiredCount !== null &&
  allocationsMatchedCount !== undefined &&
  allocationsMatchedCount !== null &&
  allocationsRequiredCount === allocationsMatchedCount;

const buildDealPersistenceData = (deal: PorepMarketDeal) => ({
  onChainDealId: deal.dealId,
  client: deal.client,
  provider: deal.provider,
  offerId: deal.offerId,
  railId: deal.railId,
  evidenceAdapterContractAddress: deal.evidenceAdapterContractAddress,
  validatorContractAddress: deal.validatorContractAddress,
  providerOrganization: deal.providerOrganization,
  state: deal.state,
  manifestHash: deal.manifestHash,
  manifestLocation: deal.manifestLocation,
  expiresAtEpoch: deal.expiresAtEpoch,
  serviceStartEpoch: deal.serviceStartEpoch,
  serviceEndEpoch: deal.serviceEndEpoch,
  reservedBytes: deal.reservedBytes,
  committedBytes: deal.committedBytes,
  allocationsRequiredCount: deal.allocationsRequiredCount,
  allocationsMatchedCount: deal.allocationsMatchedCount,
  isAllocationsMatched: hasMatchedAllocations(deal),
  dataCapAllocationStatus: deal.dataCapAllocationStatus,
  dealStartEpoch: deal.dealStartEpoch,
  dealEndEpoch: deal.dealEndEpoch,
  allocationIds: deal.allocationIds,
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
  allocationIds: deal.allocationIds ?? [],
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

async function syncDealClaims({
  tx,
  porepMarketDealId,
  claims,
}: {
  tx: Prisma.TransactionClient;
  porepMarketDealId: string;
  claims?: PorepMarketDealClaim[];
}) {
  if (!claims?.length) return;

  await tx.porep_market_deal_claim.deleteMany({
    where: {
      porepMarketDealId,
    },
  });

  return tx.porep_market_deal_claim.createMany({
    data: claims.map((claim) => ({
      porepMarketDealId,
      ...claim,
    })),
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
  const relationOperations = deals.flatMap((deal) => {
    const porepMarketDealId = dealsMap.get(deal.dealId.toString())!.id;

    return [
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
        porepMarketDealId,
        claims: deal.claims,
      }),
    ];
  });

  await Promise.all(relationOperations);
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
