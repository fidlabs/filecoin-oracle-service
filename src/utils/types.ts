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
  updatedAt: Date;
  data: StorageProvidersSLIData[];
}
