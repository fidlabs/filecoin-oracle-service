import { Abi } from "viem";

export const SLI_SCORER_CONTRACT_ABI = [
  {
    type: "function",
    name: "calculateScore",
    inputs: [
      {
        name: "provider",
        type: "uint64",
        internalType: "CommonTypes.FilActorId",
      },
      {
        name: "required",
        type: "tuple",
        internalType: "struct SLITypes.SLIThresholds",
        components: [
          {
            name: "retrievabilityBps",
            type: "uint16",
            internalType: "uint16",
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
    ],
    outputs: [
      {
        name: "score",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
] as const satisfies Abi;
