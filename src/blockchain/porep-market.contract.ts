import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { PorepMarketContractDealProposal } from "../utils/types";
import { POREP_MARKET_CONTRACT_ABI } from "./abis/porep-market-abi";
import { getRpcClient } from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[PoRep Market Contract] " },
);

export async function getCompletedDealsFromPoRepMarketContract(): Promise<
  PorepMarketContractDealProposal[]
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

  return completedDeals as PorepMarketContractDealProposal[];
}

export async function getDealsFromPoRepMarketContract(): Promise<
  PorepMarketContractDealProposal[]
> {
  childLogger.info("Fetching completed deals...");

  const rpcClient = getRpcClient();

  const completedDeals = await rpcClient.readContract({
    address: SERVICE_CONFIG.POREP_MARKET_CONTRACT_ADDRESS as Address,
    abi: POREP_MARKET_CONTRACT_ABI,
    functionName: "getDeals",
  });

  childLogger.info(
    `Fetched ${completedDeals.length} completed deals from contract`,
  );

  return completedDeals as PorepMarketContractDealProposal[];
}
