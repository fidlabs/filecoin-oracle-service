import { Address } from "viem";

export interface SLIThresholds {
  retrievabilityPct: number;
  bandwidthMbps: number;
  latencyMs: number;
  indexingPct: number;
}

export interface SliAttestation {
  provider: bigint;
  slis: SLIThresholds;
}

export enum StorageProvidersSliMetricType {
  RPA_RETRIEVABILITY = "RPA_RETRIEVABILITY",
  IPNI_REPORTING = "IPNI_REPORTING",
  TTFB = "TTFB",
  BANDWIDTH = "BANDWIDTH",
}

export interface StorageProviderSliMetadata {
  sliMetricType: StorageProvidersSliMetricType;
  sliMetricName: string;
  sliMetricDescription: string;
  sliMetricUnit: string;
}

export interface StorageProvidersSliData {
  sliMetricType: StorageProvidersSliMetricType;
  sliMetricValue: string;
}

export interface CdpSliResponse {
  sliMetadata: {
    [code: string]: StorageProviderSliMetadata;
  };
  data: { [storageProviderId: string]: StorageProvidersSliData[] };
}

export interface FilecoinAPIStateSectorGetInfo {
  SectorNumber: number;
  SealProof: number;
  SealedCID: {
    "/": string;
  };
  Activation: number;
  Expiration: number;
  DealWeight: string;
  VerifiedDealWeight: string;
  InitialPledge: string;
  ExpectedDayReward: string;
  ExpectedStoragePledge: string;
  PowerBaseEpoch: number;
  ReplacedDayReward: string;
  Flags: number;
  DailyFee: string;
}

export interface FilecoinAPIStateGetClaim {
  Provider: number;
  Client: number;
  Data: {
    "/": string;
  };
  Size: number;
  TermMin: number;
  TermMax: number;
  TermStart: number;
  Sector: number;
}

enum DealState {
  Proposed,
  Accepted,
  Completed,
  Rejected,
}

export interface DealTerms {
  dealSizeBytes: bigint;
  pricePerSector: bigint;
  durationDays: number;
}

export interface DealProposal {
  dealId: bigint;
  client: Address;
  provider: bigint;
  validator: Address;
  railId: bigint;
  manifestLocation: string;
  state: DealState;
  terms: DealTerms;
  requirements: SLIThresholds;
}
