import { Address } from "viem";

export interface BigInt {
  toJSON: () => string;
}

export interface SLIThresholds {
  retrievabilityBps: number;
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

export interface FilecoinAPIStateSectorExpiration {
  OnTime: number;
  Early: number;
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

export enum DealState {
  Proposed = "Proposed",
  Accepted = "Accepted",
  Completed = "Completed",
  Rejected = "Rejected",
  Terminated = "Terminated",
}

export interface DealTerms {
  dealSizeBytes: bigint;
  pricePerSectorPerMonth: bigint;
  durationDays: number;
}

export enum PorepMarketContractDealState {
  Proposed,
  Accepted,
  Completed,
  Rejected,
  Terminated,
}

export interface PorepMarketContractDealProposal {
  dealId: bigint;
  client: Address;
  provider: bigint;
  validator: Address;
  railId: bigint;
  manifestLocation: string;
  proposedAtBlock: bigint;
  state: PorepMarketContractDealState;
  terms: DealTerms;
  requirements: SLIThresholds;
}

export interface PorepMarketDealClaim {
  claimId: bigint;
  sector: bigint;
  status?: SectorStatus;
}

export interface PorepMarketDeal {
  dealId: bigint;
  client: Address;
  provider: bigint;
  validatorContractAddress: Address;
  railId: bigint;
  dealStartEpoch?: bigint;
  dealEndEpoch?: bigint;
  manifestLocation: string;
  state: DealState;
  allocationsRequiredCount?: bigint;
  allocationsMatchedCount?: bigint;
  isAllocationsMatched?: boolean;
  isDealEndEpochSetOnChain: boolean;
  allocationIds?: bigint[];
  claims?: PorepMarketDealClaim[];
  isRailTerminated: boolean;
  terms: DealTerms;
  requirements: SLIThresholds;
  proposedAtBlock: bigint;
}

export interface ProviderScore {
  providerId: bigint;
  calculatedScore: bigint;
  porepMarketDealId: string;
  averageRetrievabilityBps: bigint;
  averageBandwidthMbps: bigint;
  averageLatencyMs: bigint;
  averageIndexingPct: bigint;
}

export enum SectorStatus {
  Dead = "Dead",
  Active = "Active",
  Faulty = "Faulty",
}

export interface FailCode {
  idx: number;
  code: number;
}

export interface BatchReturn {
  success_count: number;
  fail_codes: FailCode[];
}

export interface Claim {
  provider: bigint;
  client: bigint;
  data: string;
  size: bigint;
  term_min: bigint;
  term_max: bigint;
  term_start: bigint;
  sector: bigint;
}

export interface GetClaimsReturn {
  batch_info: BatchReturn;
  claims: Claim[];
}
