export interface IRepository<T> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
  update(id: string, entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}
