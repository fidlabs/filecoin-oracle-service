import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { CLAIM_INSPECTOR_CONTRACT_ABI } from "./abis/claim-inspector-abi";
import { getRpcClient } from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Claim Inspector Contract] " },
);

export const getAllClaimsFromClaimInspectorContract = async (
  onChainDealId: bigint,
) => {
  const claimInspectorAddress = SERVICE_CONFIG.CLAIM_INSPECTOR_CONTRACT_ADDRESS;
  if (!claimInspectorAddress) {
    throw new Error(
      "CLAIM_INSPECTOR_CONTRACT_ADDRESS is not set; deploy PoRepMarketClaimInspector or leave unset to skip claim detail sync",
    );
  }

  childLogger.info(`Fetching claims for deal ${onChainDealId}...`);

  const rpcClient = getRpcClient();

  const response = await rpcClient.readContract({
    address: claimInspectorAddress as Address,
    abi: CLAIM_INSPECTOR_CONTRACT_ABI,
    functionName: "getClaimForDeal",
    args: [onChainDealId],
  });

  childLogger.info(
    `Fetched ${response[1].length} success claims for deal ${onChainDealId} from contract`,
  );

  return response;
};
