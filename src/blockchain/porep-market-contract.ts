// import { baseLogger } from "../utils/logger.js";
// import { DealProposal } from "../utils/types.js";

// const childLogger = baseLogger.child(
//   { avengers: "assemble" },
//   { msgPrefix: "[PoRep Market Contract] " },
// );

// export async function getDealsFromPoRepMarketContract(): Promise<
//   DealProposal[]
// > {
//   //   const rpcClient = getRpcClient();

//   childLogger.info("Fetching deals...");
//   const dealProposals: DealProposal[] = [];

//   //   const dealProposals = await rpcClient.readContract({
//   //     address: SERVICE_CONFIG.SLA_ALLOCATOR_CONTRACT_ADDRESS as Address,
//   //     abi: SLA_ALLOCATOR_CONTRACT_ABI,
//   //     functionName: "getProviders",
//   //   });

//   childLogger.info(
//     `Fetched ${dealProposals.length} deal proposals from contract`,
//   );

//   return dealProposals;
// }

// export async function getProvidersFromPoRepMarketContract(): Promise<number[]> {
//   const deals = await getDealsFromPoRepMarketContract();

//   childLogger.info("Extracting unique providers from deals...");
//   const providers = [...new Set(deals.map((deal) => deal.provider))];

//   childLogger.info(`Fetched ${providers.length} providers from contract`);

//   return providers;
// }
