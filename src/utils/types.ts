import { Address, TransactionReceipt } from "viem";
import { ContractName } from "../../prisma/generated/client";

export interface BigInt {
  toJSON: () => string;
}

export interface SLIThresholds {
  retrievabilityBps: number;
  bandwidthBytesPerSecond: bigint;
  latencyMs: number;
  indexingPct: number;
}

export interface SliAttestation {
  onChainDealId: bigint;
  slis: SLIThresholds;
}

export enum DealSliMetricType {
  RETRIEVABILITY_BPS = "RETRIEVABILITY_BPS",
  INDEXING_PCT = "INDEXING_PCT",
  LATENCY_MS = "LATENCY_MS",
  BANDWIDTH_MBPS = "BANDWIDTH_MBPS",
}

export interface DealSliMetadata {
  name: string;
  description: string;
  unit: string;
}

export interface DealSliData {
  name: DealSliMetricType;
  value: string;
}

export interface CdpDealSliResponse {
  sliMetadata: { [K in DealSliMetricType]: DealSliMetadata };
  data: { [dealId: string]: DealSliData[] };
}

export interface FilecoinAPIStateSectorPartition {
  Partition: bigint;
  Deadline: bigint;
}

export interface CdpFilecoinPayRailResponse {
  railId: string;
  token: {
    address: Address;
    symbol: string;
    decimals: number;
  };
  from: Address;
  to: Address;
  operator: Address;
  validator: Address;
  paymentRate: string;
  lockupFixed: string;
  lockupPeriod: string;
  settledUpTo: string;
  endEpoch: string;
  commissionRateBps: number;
  serviceFeeRecipient: Address;
  finalized: boolean;
  createdAtBlock: string;
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

export interface PorepMarketContractDealSli extends SLIThresholds {
  onChainDealId: bigint;
}

export interface PorepMarketContractDealProposal {
  dealId: bigint;
  client: Address;
  provider: bigint;
  validator: Address;
  offerId: bigint;
  state: PorepMarketContractDealState;
  evidenceAdapter: Address;
  railId: bigint;

  // manifestLocation: string;
  // proposedAtBlock: bigint;
  // terms: DealTerms;
  // requirements: SLIThresholds;
}

export interface PorepMarketDealClaim {
  claimId: bigint;
  sector: bigint;
  status?: SectorStatus;
  provider: bigint;
  client: bigint;
  data: `0x${string}`;
  size: bigint;
  term_min: bigint;
  term_max: bigint;
  term_start: bigint;
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
  activatePaymentAt?: Date | null;
  allocationIds?: bigint[];
  claims?: PorepMarketDealClaim[];
  isRailTerminated?: boolean;
  terms: DealTerms;
  requirements: SLIThresholds;
  proposedAtBlock: bigint;
}

export interface DealScore {
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

export enum ChainSectorStatus {
  Dead = 0,
  Active = 1,
  Faulty = 2,
}

export interface Claim {
  provider: bigint;
  client: bigint;
  data: `0x${string}`;
  size: bigint;
  term_min: bigint;
  term_max: bigint;
  term_start: bigint;
  sector: bigint;
}
export interface OnChainTransactionResult {
  success: boolean;
  contractName: ContractName;
  functionName: string;
  receipt: TransactionReceipt;
}

export type GasUsageByFunction = {
  functionName: string;
  transactionCount: bigint;
  gasUsed: bigint;
};
