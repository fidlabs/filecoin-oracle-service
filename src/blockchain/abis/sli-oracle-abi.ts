import { Abi } from "viem";

export const SLI_ORACLE_ABI = [
  {
    type: "function",
    name: "setSLI",
    inputs: [
      {
        name: "provider",
        type: "address",
        internalType: "address",
      },
      {
        name: "slis",
        type: "tuple",
        internalType: "struct SLIOracle.SLIAttestation",
        components: [
          {
            name: "lastUpdate",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "availability",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "latency",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "indexing",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "retention",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "bandwidth",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "stability",
            type: "uint16",
            internalType: "uint16",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "multicall",
    inputs: [
      {
        name: "data",
        type: "bytes[]",
        internalType: "bytes[]",
      },
    ],
    outputs: [
      {
        name: "results",
        type: "bytes[]",
        internalType: "bytes[]",
      },
    ],
    stateMutability: "nonpayable",
  },
] as const satisfies Abi;
