import { Abi } from "viem";

export const POREP_MARKET_CONTRACT_ABI = [
  {
    type: "function",
    name: "getCompletedDeals",
    inputs: [],
    outputs: [
      {
        name: "completedDeals",
        type: "tuple[]",
        internalType: "struct PoRepMarket.DealProposal[]",
        components: [
          {
            name: "dealId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "client",
            type: "address",
            internalType: "address",
          },
          {
            name: "provider",
            type: "uint64",
            internalType: "CommonTypes.FilActorId",
          },
          {
            name: "SLC",
            type: "address",
            internalType: "address",
          },
          {
            name: "validator",
            type: "address",
            internalType: "address",
          },
          {
            name: "state",
            type: "uint8",
            internalType: "enum PoRepMarket.DealState",
          },
          {
            name: "railId",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const satisfies Abi;
