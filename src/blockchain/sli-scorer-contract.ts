import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { SLIThresholds } from "../utils/types";
import { SLI_SCORER_CONTRACT_ABI } from "./abis/sli-scorer-abi";
import { getRpcClient } from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SLI Scorer Contract] " },
);

export async function calculateScoreOnSliScorerContract(
  providerId: bigint,
  requirements: SLIThresholds,
): Promise<bigint> {
  const functionName = "calculateScore";

  childLogger.info(`Calculating score for provider ${providerId}`);

  const rpcClient = getRpcClient();

  const storageProviderScore = await rpcClient.readContract({
    address: SERVICE_CONFIG.SLI_SCORER_CONTRACT_ADDRESS as Address,
    abi: SLI_SCORER_CONTRACT_ABI,
    functionName: functionName,
    args: [providerId, { ...requirements }],
  });

  childLogger.info(
    `Calculated score for provider ${providerId}: ${storageProviderScore}`,
  );

  return storageProviderScore;
}
