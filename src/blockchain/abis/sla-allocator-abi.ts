import { Abi } from "viem";

export const SLA_ALLOCATOR_ABI = [
  {
    type: "function",
    name: "providers",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "CommonTypes.FilActorId",
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
