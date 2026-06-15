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
  onChainDealId: bigint,
  requirements: SLIThresholds,
): Promise<bigint> {
  const functionName = "calculateScore";

  childLogger.info(`Calculating score for deal ${onChainDealId}`);

  const rpcClient = getRpcClient();

  const dealScore = await rpcClient.readContract({
    address: SERVICE_CONFIG.SLI_SCORER_CONTRACT_ADDRESS as Address,
    abi: SLI_SCORER_CONTRACT_ABI,
    functionName: functionName,
    args: [onChainDealId, { ...requirements }],
  });

  childLogger.info(`Calculated score for deal ${onChainDealId}: ${dealScore}`);

  return dealScore;
}
