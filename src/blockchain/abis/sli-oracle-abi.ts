export const SLI_ORACLE_ABI = [
  {
    type: "function",
    name: "setSLI",
    inputs: [
      {
        name: "provider",
        type: "uint64",
        internalType: "CommonTypes.FilActorId",
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
            name: "latency",
            type: "uint32",
            internalType: "uint32",
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
          {
            name: "availability",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "indexing",
            type: "uint8",
            internalType: "uint8",
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
  {
    type: "function",
    name: "attestations",
    inputs: [
      {
        name: "provider",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [
      {
        name: "lastUpdate",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "latency",
        type: "uint32",
        internalType: "uint32",
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
      {
        name: "availability",
        type: "uint8",
        internalType: "uint8",
      },
      {
        name: "indexing",
        type: "uint8",
        internalType: "uint8",
      },
    ],
    stateMutability: "view",
  },
];
