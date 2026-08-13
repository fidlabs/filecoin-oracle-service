import {
  DataCapAllocationStatus,
  DealState,
  DealType,
  EvidenceResult,
} from "../../prisma/generated/client";
import { PorepMarketDealDto } from "../../src/services/db/dto/porep-market-deal.dto";

export function buildStagingPorepMarketDeal(
  overrides: Partial<PorepMarketDealDto> = {},
): PorepMarketDealDto {
  return {
    id: "c9708900-6887-4ef4-a645-ecae36ee08af",
    onChainDealId: 3n,
    client: "0x33c6AE44A863D2aA04ab1B9a6DA9De6A8f484C44",
    provider: 1000n,
    offerId: 2n,
    railId: 0n,
    state: DealState.Accepted,
    dealType: DealType.Public,
    evidenceAdapterContractAddress:
      "0xfEBd13e0DecCD8B96c2781da32b30BbEB12884Db",
    validatorContractAddress: "0x0000000000000000000000000000000000000000",
    providerOrganization: null,

    manifestHash:
      "0x8ec2dd3bafb218a5ffe1f95a82d4050078ffdb0334174467f43624e53f953557",
    manifestLocation:
      "https://gist.githubusercontent.com/Szooot/c7a98bc24bfaf70968feebed666a529b/raw/c9d0ecded4eb34c07a7339a0647dac63f96da722/test_manifest.json",

    proposedAtEpoch: 3973257n,
    expiresAtEpoch: null,
    serviceStartEpoch: 0n,
    serviceEndEpoch: 0n,
    earlyTerminationEpoch: 0n,
    minTimeBetweenSettlementsInEpochs: 86400n,
    lastSettledEpoch: 0n,
    dealStartEpoch: null,
    dealEndEpoch: null,

    reservedBytes: 1073741824n,
    committedBytes: 0n,

    allocationsRequiredCount: null,
    allocationsMatchedCount: null,
    isAllocationsMatched: false,
    dataCapAllocationStatus: DataCapAllocationStatus.None,
    allocationIds: [],
    isRailTerminated: false,

    urlFinderSliTargetTriggeredAt: null,
    createdAt: new Date("2026-08-12T08:44:34.863Z"),
    updatedAt: new Date("2026-08-13T01:00:00.627Z"),
    lastSyncedAt: new Date("2026-08-13T01:00:00.567Z"),

    terms: {
      requestedSizeBytes: 1073741824n,
      durationEpochs: 518400n,
    },
    requiredSLIs: {
      retrievabilityBps: 10000n,
      bandwidthBytesPerSecond: 12500000n,
      latencyMs: 1n,
      indexingPct: 100n,
    },
    payment: {
      paymentToken: "0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0",
      payee: "0x087Ea8b72CBf4B435023356776834eB10dd07f2a",
      pricePer32GiBPerMonth: 31250000000000000n,
      billed32GiBUnits: 0n,
      railMaxRatePerEpoch: 0n,
    },
    evidenceStatus: {
      activeCoveredBytes: 0n,
      lastEvidenceRefreshEpoch: 0n,
      reasonCode: 0n,
      checkedClaims: 0n,
      totalClaims: 0n,
      result: EvidenceResult.Inactive,
    },

    score: [],
    history: [
      {
        state: DealState.Accepted,
        createdAt: new Date("2026-08-12T08:44:34.863Z"),
      },
    ],
    settlement_history: [],
    claims: [],

    ...overrides,
  };
}
