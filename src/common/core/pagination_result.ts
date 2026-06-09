export type PaginationResultBody = {
  limit?: number;
  offset?: number;
  total?: number;
  nextCursor: number | null;
};

export type PaginationResult<T> = { data: T } & PaginationResultBody;
