import { z } from "zod";

export const GetGasUsageHistoryQuerySchema = z.object({
  onChainDealId: z
    .string()
    .regex(/^\d+$/, "onChainDealId must be a numeric string")
    .optional(),
  functionName: z.string().min(1).optional(),
});
