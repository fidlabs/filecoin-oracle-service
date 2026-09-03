import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { PorepMarketContractDealView } from "../utils/types";
import { POREP_MARKET_VIEW_CONTRACT_ABI } from "./abis/porep-market-view-helper-abi";
import { getRpcClient } from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[PoRep Market View Contract] " },
);

const DEAL_VIEWS_PAGE_SIZE = 500n;

export async function getDealsFromPoRepMarketViewContract(): Promise<
  PorepMarketContractDealView[]
> {
  childLogger.info("Fetching deal views...");

  const rpcClient = getRpcClient();
  const dealViews: PorepMarketContractDealView[] = [];

  let offset = 0n;
  let totalDeals = 0n;

  do {
    const [pageDealViews, total] = await rpcClient.readContract({
      address: SERVICE_CONFIG.POREP_MARKET_VIEW_CONTRACT_ADDRESS as Address,
      abi: POREP_MARKET_VIEW_CONTRACT_ABI,
      functionName: "getDealViews",
      args: [offset, DEAL_VIEWS_PAGE_SIZE],
    });

    totalDeals = total;
    dealViews.push(...pageDealViews);
    offset += BigInt(pageDealViews.length);

    childLogger.info(`Fetched ${dealViews.length}/${totalDeals} deal views`);

    if (pageDealViews.length === 0) {
      break;
    }
  } while (offset < totalDeals);

  childLogger.info(`Fetched ${dealViews.length} deal views from contract`);

  return dealViews;
}
