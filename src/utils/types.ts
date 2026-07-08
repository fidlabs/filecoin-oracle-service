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
  None = "None",
  Proposed = "Proposed",
  Accepted = "Accepted",
  Active = "Active",
  Finalized = "Finalized",
  Rejected = "Rejected",
  Expired = "Expired",
  Terminated = "Terminated",
}

export interface DealTerms {
  requestedSizeBytes: bigint;
  durationEpochs: bigint;
}

export interface DealPayment {
  paymentToken: Address;
  pricePer32GiBPerMonth: bigint;
  billed32GiBUnits: bigint;
  railMaxRatePerEpoch: bigint;
}

export interface DealEvidenceStatus {
  activeCoveredBytes: bigint;
  lastEvidenceRefreshEpoch: bigint;
  reasonCode: bigint;
  result: bigint;
}

export enum PorepMarketContractDealState {
  None = 0,
  Proposed = 10,
  Accepted = 20,
  Active = 30,
  Finalized = 40,
  Rejected = 50,
  Expired = 60,
  Terminated = 70,
}

export interface PorepMarketContractDealSli extends SLIThresholds {
  onChainDealId: bigint;
}

export enum EvidenceResult {
  None = 0,
  Partial = 10,
  Accepted = 20,
  Rejected = 30,
}

export interface EvidenceActivationDecision {
  coveredBytes: bigint;
  reasonCode: number;
  result: EvidenceResult;
}

export interface PorepMarketContractDealView {
  deal: {
    dealId: bigint;
    client: Address;
    provider: bigint;
    offerId: bigint;
    state: PorepMarketContractDealState;
    evidenceAdapter: Address;
    validator: Address;
    railId: bigint;
  };
  data: {
    manifestHash: Address;
    manifestLocation: string;
  };
  requiredSLIs: SLIThresholds;
  terms: {
    requestedSizeBytes: bigint;
    durationEpochs: bigint;
  };
  timing: {
    proposedAtEpoch: bigint;
    expiresAtEpoch: bigint;
  };
  service: {
    serviceStartEpoch: bigint;
    serviceEndEpoch: bigint;
  };
  capacity: {
    reservedBytes: bigint;
    committedBytes: bigint;
  };
  payment: {
    paymentToken: Address;
    pricePer32GiBPerMonth: bigint;
    billed32GiBUnits: bigint;
    railMaxRatePerEpoch: bigint;
  };
  providerOrganization: Address;
  evidenceStatus: {
    activeCoveredBytes: bigint;
    lastEvidenceRefreshEpoch: bigint;
    reasonCode: number;
    result: number;
  };
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
  offerId?: bigint;
  validatorContractAddress: Address;
  evidenceAdapterContractAddress: Address;
  railId: bigint;
  providerOrganization?: Address;
  dealStartEpoch?: bigint;
  dealEndEpoch?: bigint;
  manifestHash?: `0x${string}`;
  manifestLocation?: string;
  expiresAtEpoch?: bigint;
  serviceStartEpoch?: bigint;
  serviceEndEpoch?: bigint;
  reservedBytes?: bigint;
  committedBytes?: bigint;
  state: DealState;
  allocationsRequiredCount?: bigint;
  allocationsMatchedCount?: bigint;
  isAllocationsMatched?: boolean;
  activatePaymentAt?: Date | null;
  allocationIds?: bigint[];
  claims?: PorepMarketDealClaim[];
  isRailTerminated?: boolean;
  terms: DealTerms;
  payment: DealPayment;
  requiredSLIs: SLIThresholds;
  evidenceStatus?: DealEvidenceStatus;
  proposedAtEpoch: bigint;
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
