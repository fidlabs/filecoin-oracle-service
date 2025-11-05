export interface SLIAttestation {
  lastUpdate: bigint;
  availability: number;
  latency: number;
  indexing: number;
  retention: number;
  bandwidth: number;
  stability: number;
}

export interface CdpSliResponse {
  provider: string;
  sli: SLIAttestation;
}
