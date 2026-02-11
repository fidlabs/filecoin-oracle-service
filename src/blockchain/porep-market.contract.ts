import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env.js";
import { baseLogger } from "../utils/logger.js";
import { DealProposal } from "../utils/types.js";
import { POREP_MARKET_CONTRACT_ABI } from "./abis/porep-market-abi.js";
import { getRpcClient } from "./blockchain-client.js";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[PoRep Market Contract] " },
);

export async function getCompletedDealsFromPoRepMarketContract(): Promise<
  DealProposal[]
> {
  childLogger.info("Fetching completed deals...");

  const rpcClient = getRpcClient();

  const completedDeals = await rpcClient.readContract({
    address: SERVICE_CONFIG.POREP_MARKET_CONTRACT_ADDRESS as Address,
    abi: POREP_MARKET_CONTRACT_ABI,
    functionName: "getCompletedDeals",
  });

  childLogger.info(
    `Fetched ${completedDeals.length} completed deals from contract`,
  );

  return completedDeals as DealProposal[];
}
