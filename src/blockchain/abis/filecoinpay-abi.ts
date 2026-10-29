import { Abi } from "viem";

export const FILECOIN_PAY_CONTRACT_ABI = [
  {
    type: "error",
    name: "RailInactiveOrSettled",
    inputs: [{ name: "railId", type: "uint256" }],
  },
  {
    type: "function",
    name: "getRail",
    stateMutability: "view",
    inputs: [{ name: "railId", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple",
      components: [
        { name: "token", type: "address" },
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "operator", type: "address" },
        { name: "validator", type: "address" },
        { name: "paymentRate", type: "uint256" },
        { name: "lockupPeriod", type: "uint256" },
        { name: "lockupFixed", type: "uint256" },
        { name: "settledUpTo", type: "uint256" },
        { name: "endEpoch", type: "uint256" },
        { name: "commissionRateBps", type: "uint256" },
        { name: "serviceFeeRecipient", type: "address" },
      ],
    }],
  },
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
