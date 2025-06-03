export class BookFactory {
  static create(title: string, author: string, publishedYear?: number, genre?: string): any {
    return {
      title,
      author,
      publishedYear,
      genre,
    };
  }
}