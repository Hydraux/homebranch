export class Book {
  constructor(
    public id: string,
    public title: string,
    public author: string,
    public fileName: string,
    public isFavorited: boolean,
    public publishedYear?: number,
    public coverImageFileName?: string,
  ) {}
}
