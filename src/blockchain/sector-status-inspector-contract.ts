import {
  Address,
  decodeAbiParameters,
  decodeFunctionResult,
  encodeFunctionData,
} from "viem";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { ChainSectorStatus } from "../utils/types";
import { SECTOR_STATUS_INSPECTOR_ABI } from "./abis/sector-status-inspector-abi";
import { getRpcClient } from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Sector Status Inspector Contract] " },
);

export const batchValidateSectorStatus = async (
  calls: {
    onChainDealId: bigint;
    sector: bigint;
    status: ChainSectorStatus;
    deadline: bigint;
    partition: bigint;
  }[],
) => {
  const rpcClient = getRpcClient();

  childLogger.info(
    `Batch validating sector status for ${calls.length} calls...`,
  );

  const encodedCalls = calls.map((c) =>
    encodeFunctionData({
      abi: SECTOR_STATUS_INSPECTOR_ABI,
      functionName: "validateSectorStatus",
      args: [c.onChainDealId, c.sector, c.status, c.deadline, c.partition],
    }),
  );

  const encoded = encodeFunctionData({
    abi: SECTOR_STATUS_INSPECTOR_ABI,
    functionName: "multicall",
    args: [encodedCalls],
  });

  const raw = await rpcClient.call({
    to: SERVICE_CONFIG.SECTOR_STATUS_INSPECTOR_CONTRACT_ADDRESS as Address,
    data: encoded,
  });

  const decoded = decodeAbiParameters(
    [{ type: "bytes[]" }],
    raw.data as `0x${string}`,
  );

  const results = decoded[0].map((result, index) => {
    const decodedBool = decodeFunctionResult({
      abi: SECTOR_STATUS_INSPECTOR_ABI,
      functionName: "validateSectorStatus",
      data: result,
    });

    return {
      call: calls[index],
      isValid: decodedBool,
    };
  });

  childLogger.info(
    `Batch validation completed for ${calls.length} calls. Valid results: ${results.filter((r) => r.isValid).length}, Invalid results: ${results.filter((r) => !r.isValid).length}`,
  );

  return results;
};
