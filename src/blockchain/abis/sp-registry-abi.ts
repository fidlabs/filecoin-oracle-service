import { Abi } from "viem";

export const SP_REGISTRY_CONTRACT_ABI = [
  {
    type: "function",
    name: "getCommittedProviders",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64[]",
        internalType: "CommonTypes.FilActorId[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProviders",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64[]",
        internalType: "CommonTypes.FilActorId[]",
      },
    ],
    stateMutability: "view",
  },
] as const satisfies Abi;
