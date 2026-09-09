import { z } from "zod";
import {
  PaginationRequestQuerySchema,
  PaginationResponseMetaSchema,
} from "../../utils/pagination/schema";

export const DealStateSchema = z.enum([
  "None",
  "Proposed",
  "Accepted",
  "Active",
  "Finalized",
  "Rejected",
  "Expired",
  "Terminated",
]);

export const GetFilteredDealsQuerySchema = PaginationRequestQuerySchema.extend({
  state: DealStateSchema.optional(),
});

export const DealSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const PaginatedDealsResponseSchema = z.object({
  items: z.array(DealSchema),
  meta: PaginationResponseMetaSchema,
});

export const TotalCompletedDealsResponseSchema = z.object({
  totalCompletedDeals: z.number(),
});

export const GetDealByIdRequestSchema = z.object({
  onChainDealId: z.string(),
});

export const GetByIdDealIdQuerySchema = z.object({
  onChainDealId: z
    .string()
    .regex(/^\d+$/, "onChainDealId must be a numeric string")
    .optional(),
});
