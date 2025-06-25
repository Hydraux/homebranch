export class BookNotFoundError extends Error {
  constructor() {
    super('Book not found');
    this.name = 'BookNotFoundError';
  }
}
