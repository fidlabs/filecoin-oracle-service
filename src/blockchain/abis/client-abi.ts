import { Abi } from "viem";

export const CLIENT_CONTRACT_ABI = [
  {
    type: "function",
    name: "getSPClients",
    inputs: [
      {
        name: "provider",
        type: "uint64",
        internalType: "CommonTypes.FilActorId",
      },
    ],
    outputs: [
      {
        name: "clients",
        type: "address[]",
        internalType: "address[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getClientAllocationIdsPerProvider",
    inputs: [
      {
        name: "provider",
        type: "uint64",
        internalType: "CommonTypes.FilActorId",
      },
      {
        name: "client",
        type: "address",
        internalType: "address",
      },
    ],
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
    name: "claimsTerminatedEarly",
    inputs: [
      {
        name: "claims",
        type: "uint64[]",
        internalType: "uint64[]",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const satisfies Abi;
