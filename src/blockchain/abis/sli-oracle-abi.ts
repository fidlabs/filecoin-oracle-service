export const SLI_ORACLE_CONTRACT_ABI = [
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
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [
      {
        name: "interfaceId",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
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
  {
    type: "function",
    name: "renounceRole",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "callerConfirmation",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeRole",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "RoleRevoked",
    inputs: [
      {
        name: "role",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
];
