import { PaginatedQuery } from 'src/common/core/paginated-query';

export class GetBooksRequest extends PaginatedQuery {
  userId?: string;
  viewerUserId?: string;
  isbn?: string;
  genre?: string;
  series?: string;
  author?: string;
}
