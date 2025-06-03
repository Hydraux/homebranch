import { Inject, Injectable } from "@nestjs/common";
import { IBookRepository } from "src/application/interfaces/book-repository";
import { Repository } from "typeorm";
import { BookEntity } from "../database/book.entity";
import { BookMapper } from "../mappers/book.mapper";
import { InjectRepository } from "@nestjs/typeorm";


@Injectable()
export class TypeOrmBookRepository implements IBookRepository {

    constructor(
        @InjectRepository(BookEntity) private repository: Repository<BookEntity>
    ) {}
    
    async create(entity: Book): Promise<Book> {
        const bookEntity = BookMapper.toPersistence(entity);
        const savedEntity = await this.repository.save(bookEntity);
        return BookMapper.toDomain(savedEntity);
    }

    async findAll(): Promise<Book[]> {
        const bookEntities = await this.repository.find();
        return BookMapper.toDomainList(bookEntities);
    }
    
    async findById(id: string): Promise<Book | null> {
        const bookEntity = await this.repository.findOne({ where: { id } }) || null;
        return bookEntity ? BookMapper.toDomain(bookEntity) : null;
    }
    
    async save(book: Book): Promise<void> {
        const bookEntity = BookMapper.toPersistence(book);
        this.repository.save(bookEntity);
    }
    
    async update(id: string, book: Book): Promise<void> {
        const bookEntity = BookMapper.toPersistence(book);
        await this.repository.save(bookEntity);
        return;
    }
    
    async delete(id: string): Promise<void> {
        await this.repository.delete(id);
        return;
    }
    
    async findByAuthor(author: string): Promise<Book[]> {
        const bookEntities = await this.repository.find({ where: { author } });
        return BookMapper.toDomainList(bookEntities);
    }
    
    async findByGenre(genre: string): Promise<Book[]> {
        const bookEntities = await this.repository.find({ where: { genre } });
        return BookMapper.toDomainList(bookEntities);
    }
    
    async findByTitle(title: string): Promise<Book | null> {
        const bookEntity = await this.repository.findOne({ where: { title } }) || null;
        return bookEntity ? BookMapper.toDomain(bookEntity) : null;
    }
}