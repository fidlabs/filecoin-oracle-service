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
            name: "requirements",
            type: "tuple",
            internalType: "struct SLITypes.SLIThresholds",
            components: [
              {
                name: "retrievabilityPct",
                type: "uint8",
                internalType: "uint8",
              },
              {
                name: "bandwidthMbps",
                type: "uint16",
                internalType: "uint16",
              },
              {
                name: "latencyMs",
                type: "uint16",
                internalType: "uint16",
              },
              {
                name: "indexingPct",
                type: "uint8",
                internalType: "uint8",
              },
            ],
          },
          {
            name: "terms",
            type: "tuple",
            internalType: "struct SLITypes.DealTerms",
            components: [
              {
                name: "dealSizeBytes",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "pricePerSector",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "durationDays",
                type: "uint32",
                internalType: "uint32",
              },
            ],
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
          {
            name: "manifestLocation",
            type: "string",
            internalType: "string",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const satisfies Abi;
