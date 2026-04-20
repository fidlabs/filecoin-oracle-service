export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginatedMeta;
}

interface NormalizedPagination {
  page: number;
  limit: number;
  offset: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export function normalizePagination(
  query: PaginationQuery,
): NormalizedPagination {
  const page = Math.max(1, query.page ?? DEFAULT_PAGE);

  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}
