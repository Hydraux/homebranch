export interface CreateBookRequest {
  title: string;
  author: string;
  isFavorited?: boolean;
  publishedYear?: number;
  fileName: string;
  coverImageFileName?: string;
}
