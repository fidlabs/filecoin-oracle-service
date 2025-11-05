import { Abi } from "viem";

export const SLA_ALLOCATOR_ABI = [
  {
    name: "providers",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64[]",
      },
    ],
  },
] as const satisfies Abi;
