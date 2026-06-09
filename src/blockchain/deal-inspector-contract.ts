import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { INSPECTOR_CONTRACT_ABI } from "./abis/deal-inspector-abi";
import { getRpcClient } from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Deal Inspector Contract] " },
);

export const getAllClaimsFromDealInspectorContract = async (
  onChainDealId: bigint,
) => {
  childLogger.info(`Fetching claims for deal ${onChainDealId}...`);

  const rpcClient = getRpcClient();

  const response = await rpcClient.readContract({
    address: SERVICE_CONFIG.DEAL_INSPECTOR_CONTRACT_ADDRESS as Address,
    abi: INSPECTOR_CONTRACT_ABI,
    functionName: "getClaimForDeal",
    args: [onChainDealId],
  });

  childLogger.info(
    `Fetched ${response[1].length} success claims for deal ${onChainDealId} from contract`,
  );

  return response;
};
