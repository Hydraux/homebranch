import { CreateDateColumn, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { BookEntity } from 'src/modules/book/book.entity';

@Entity('user_book_favorite')
export class UserBookFavoriteEntity {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @PrimaryColumn({ name: 'book_id' })
  bookId: string;

  @ManyToOne(() => BookEntity, { onDelete: 'CASCADE' })
  book: BookEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
