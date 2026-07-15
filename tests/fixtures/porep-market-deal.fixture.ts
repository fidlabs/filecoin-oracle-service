import {
  DataCapAllocationStatus,
  DealState,
} from "../../prisma/generated/client";
import { PorepMarketDealDto } from "../../src/services/db/dto/porep-market-deal.dto";

export function buildActivePorepMarketDeal(
  overrides: Partial<PorepMarketDealDto> = {},
): PorepMarketDealDto {
  const now = new Date("2026-07-14T00:00:00.000Z");

  return {
    id: "00000000-0000-4000-8000-000000000001",
    onChainDealId: 1n,
    client: "0x33c6AE44A863D2aA04ab1B9a6DA9De6A8f484C44",
    provider: 1000n,
    offerId: 2n,
    railId: 0n,
    state: DealState.Active,
    evidenceAdapterContractAddress:
      "0xB4f1dfbe5579b77847E628721db55E1B09967292",
    validatorContractAddress: "0x0000000000000000000000000000000000000000",
    providerOrganization: "0xe4Cd56f91Bc79cC610AEfB1bE92b07BB5b6F2e30",

    manifestHash:
      "eabb4e8db257705471a1eba408e886edbe95686f881685aadc2ae390b523f573",
    manifestLocation:
      "https://status.peertopool.fidl.tech/api/deals/70/manifest",

    proposedAtEpoch: 3878683n,
    expiresAtEpoch: 3884443n,
    serviceStartEpoch: 0n,
    serviceEndEpoch: 0n,
    dealStartEpoch: null,
    dealEndEpoch: null,

    reservedBytes: 34359738368n,
    committedBytes: 0n,

    allocationsRequiredCount: null,
    allocationsMatchedCount: null,
    isAllocationsMatched: false,
    dataCapAllocationStatus: DataCapAllocationStatus.None,
    allocationIds: [],
    isRailTerminated: false,

    urlFinderSliTargetTriggeredAt: null,
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: now,

    terms: {
      requestedSizeBytes: 34359738368n,
      durationEpochs: 518400n,
    },
    requiredSLIs: {
      retrievabilityBps: 0n,
      bandwidthBytesPerSecond: 0n,
      latencyMs: 0n,
      indexingPct: 0n,
    },
    payment: {
      paymentToken: "0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0",
      pricePer32GiBPerMonth: 1n,
      billed32GiBUnits: 0n,
      railMaxRatePerEpoch: 0n,
    },

    score: [],
    history: [],
    settlement_history: [],
    claims: [],

    ...overrides,
  };
}
