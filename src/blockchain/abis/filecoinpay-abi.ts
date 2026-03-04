import { Abi } from "viem";

export const FILECOIN_PAY_CONTRACT_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "railId", type: "uint256" },
      { internalType: "uint256", name: "untilEpoch", type: "uint256" },
    ],
    name: "settleRail",
    outputs: [
      { internalType: "uint256", name: "totalSettledAmount", type: "uint256" },
      { internalType: "uint256", name: "totalNetPayeeAmount", type: "uint256" },
      {
        internalType: "uint256",
        name: "totalOperatorCommission",
        type: "uint256",
      },
      { internalType: "uint256", name: "totalNetworkFee", type: "uint256" },
      { internalType: "uint256", name: "finalSettledEpoch", type: "uint256" },
      { internalType: "string", name: "note", type: "string" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const satisfies Abi;
