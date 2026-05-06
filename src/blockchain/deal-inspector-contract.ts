import { Address } from "viem";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { GetClaimsReturn } from "../utils/types";
import { INSPECTOR_CONTRACT_ABI } from "./abis/deal-inspector-abi";
import { getRpcClient } from "./blockchain-client";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Deal Inspector Contract] " },
);

// export const isSectorDeadFromDealInspectorContract = async (
//   onChainDealId: bigint,
//   sector: bigint,
// ): Promise<boolean> => {
//   childLogger.info(
//     `Checking if sector is dead for SP ${onChainDealId} and sector ${sector}...`,
//   );

//   const rpcClient = getRpcClient();

//   const isDead = await rpcClient.readContract({
//     address: SERVICE_CONFIG.DEAL_INSPECTOR_ADDRESS as Address,
//     abi: INSPECTOR_CONTRACT_ABI,
//     functionName: "isSectorDead",
//     args: [onChainDealId, sector],
//   });

//   childLogger.info(
//     `Sector status for SP ${onChainDealId} and sector ${sector}: ${isDead ? "DEAD" : "ALIVE"}`,
//   );

//   return isDead;
// };

export const getAllClaimsFromDealInspectorContract = async (
  onChainDealId: bigint,
): Promise<GetClaimsReturn> => {
  childLogger.info(`Fetching claims for deal ${onChainDealId}...`);

  const rpcClient = getRpcClient();

  const response = await rpcClient.readContract({
    address: SERVICE_CONFIG.DEAL_INSPECTOR_ADDRESS as Address,
    abi: INSPECTOR_CONTRACT_ABI,
    functionName: "getClaims",
    args: [onChainDealId],
  });

  childLogger.info(
    `Fetched ${response.batch_info.success_count} success claims for deal ${onChainDealId} from contract`,
  );

  return response as GetClaimsReturn;
};

export const getClaimsByProviderFromDealInspectorContract = async (
  providerId: bigint,
  claimIds: bigint[],
): Promise<GetClaimsReturn | void> => {
  // childLogger.info(`Fetching claims for provider ${providerId}...`);
  // const rpcClient = getRpcClient();
  // const response = await rpcClient.readContract({
  //   address: SERVICE_CONFIG.DEAL_INSPECTOR_ADDRESS as Address,
  //   abi: INSPECTOR_CONTRACT_ABI,
  //   functionName: "getClaims",
  //   args: [providerId, claimIds],
  // });
  // childLogger.info(
  //   `Fetched ${response.batch_info.success_count} success claims for provider ${providerId} from contract`,
  // );
  // return response as GetClaimsReturn;
};
