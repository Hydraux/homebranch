export interface CreateBookRequest {
    title: string;
    author: string;
    publishedYear?: number;
    genre?: string;
}