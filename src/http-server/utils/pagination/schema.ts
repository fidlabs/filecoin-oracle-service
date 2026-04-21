import { z } from "zod";

export const PaginationRequestQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export const PaginationResponseMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
