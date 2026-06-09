import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BookEntity } from 'src/modules/book/book.entity';

@Entity()
export class BookShelfEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'varchar' })
  createdByUserId?: string;

  @ManyToMany(() => BookEntity, (book) => book.bookShelves)
  @JoinTable({
    name: 'book_shelf_books',
    joinColumn: { name: 'book_shelf_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'book_id', referencedColumnName: 'id' },
  })
  books: BookEntity[];
}
