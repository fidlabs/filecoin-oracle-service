import {
  ContractDataCapAllocationStatus,
  ContractEvidenceResult,
} from "../../utils/types";

export enum DataCapAllocationStatus {
  None = "None",
  Allocated = "Allocated",
  Claimed = "Claimed",
  Inactive = "Inactive",
}

export enum EvidenceResult {
  None = "None",
  Partial = "Partial",
  Accepted = "Accepted",
  Rejected = "Rejected",
  Active = "Active",
  Inactive = "Inactive",
  CoveredBytesMismatch = "CoveredBytesMismatch",
}

export const dataCapAllocationStatusMap = {
  [ContractDataCapAllocationStatus.None]: DataCapAllocationStatus.None,
  [ContractDataCapAllocationStatus.Allocated]:
    DataCapAllocationStatus.Allocated,
  [ContractDataCapAllocationStatus.Claimed]: DataCapAllocationStatus.Claimed,
  [ContractDataCapAllocationStatus.Inactive]: DataCapAllocationStatus.Inactive,
} as const;

export const evidenceResultMap = {
  [ContractEvidenceResult.None]: EvidenceResult.None,
  [ContractEvidenceResult.Partial]: EvidenceResult.Partial,
  [ContractEvidenceResult.Accepted]: EvidenceResult.Accepted,
  [ContractEvidenceResult.Rejected]: EvidenceResult.Rejected,
  [ContractEvidenceResult.Active]: EvidenceResult.Active,
  [ContractEvidenceResult.Inactive]: EvidenceResult.Inactive,
  [ContractEvidenceResult.CoveredBytesMismatch]:
    EvidenceResult.CoveredBytesMismatch,
} as const;

export const toPrismaDataCapAllocationStatus = (
  status: ContractDataCapAllocationStatus,
): DataCapAllocationStatus => dataCapAllocationStatusMap[status];

export const toPrismaEvidenceResult = (
  result: ContractEvidenceResult,
): EvidenceResult => evidenceResultMap[result];
