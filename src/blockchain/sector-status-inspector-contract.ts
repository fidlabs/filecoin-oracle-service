import { Address, encodeFunctionData } from "viem";
import { SERVICE_CONFIG } from "../config/env";
import { getChainSectorStatusToDomain } from "../services/db/db-service";
import { baseLogger } from "../utils/logger";
import { ChainSectorStatus } from "../utils/types";
import { getRpcClient } from "./blockchain-client";
import { SECTOR_STATUS_INSPECTOR_ABI } from "./abis/sector-status-inspector-abi";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Sector Status Inspector Contract] " },
);

export const validateSectorStatusFromDealStatusInspectorContract = async (
  onChainDealId: bigint,
  sector: bigint,
  expectedStatus: ChainSectorStatus,
  deadline: bigint,
  partition: bigint,
): Promise<boolean> => {
  childLogger.info(
    `Validating sector status ${getChainSectorStatusToDomain(expectedStatus)} for SP ${onChainDealId} and sector ${sector}...`,
  );

  const rpcClient = getRpcClient();

  const encodedCalls = sliData.map((req) =>
    encodeFunctionData({
      abi: SLI_ORACLE_CONTRACT_ABI,
      functionName: "validateSectorStatus",
      args: [onChainDealId, sector, expectedStatus, deadline, partition],
    }),
  );

  const isValid = await rpcClient.readContract({
    address: SERVICE_CONFIG.SECTOR_STATUS_INSPECTOR_CONTRACT_ADDRESS as Address,
    abi: SECTOR_STATUS_INSPECTOR_ABI,
    functionName: "validateSectorStatus",
    args: [onChainDealId, sector, expectedStatus, deadline, partition],
  });

  childLogger.info(
    `Fetched sector status for deal id ${onChainDealId}: sector ${sector}: ${isValid ? "VALID" : "INVALID"}`,
  );

  return isValid;
};

export const isSectorDeadFromSectorStatusInspectorContract = async (
  onChainDealId: bigint,
  sector: bigint,
  deadline: bigint,
  partition: bigint,
): Promise<boolean> => {
  childLogger.info(
    `Checking if sector is dead for SP ${onChainDealId} and sector ${sector}...`,
  );

  const isDead = await validateSectorStatusFromDealStatusInspectorContract(
    onChainDealId,
    sector,
    ChainSectorStatus.Dead,
    deadline,
    partition,
  );

  childLogger.info(
    `Fetched sector status for deal id ${onChainDealId}: sector ${sector}: ${isDead ? "DEAD" : "ALIVE"}`,
  );

  return isDead;
};
