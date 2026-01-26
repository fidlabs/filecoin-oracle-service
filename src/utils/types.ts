export interface SLIAttestation {
  lastUpdate: bigint;
  availability: number;
  latency: number;
  indexing: number;
  retention: number;
  bandwidth: number;
  stability: number;
}

export enum StorageProvidersSLIMetric {
  RPA_RETRIEVABILITY = "RPA_RETRIEVABILITY",
  IPNI_REPORTING = "IPNI_REPORTING",
  RETENTION = "RETENTION",
  TTFB = "TTFB",
  BANDWIDTH = "BANDWIDTH",
}

export interface StorageProvidersSLIData {
  sliMetric: StorageProvidersSLIMetric;
  sliMetricName: string;
  sliMetricValue: string;
  sliMetricDescription: string;
  sliMetricUnit: string;
  updatedAt: string;
}

export interface CdpSliResponse {
  storageProviderId: string;
  storageProviderName: string | null;
  data: StorageProvidersSLIData[];
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
