import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BookEntity } from 'src/modules/book/book.entity';

export type DuplicateResolution = 'merge' | 'keep_both' | 'replace';

@Entity()
export class BookDuplicateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'suspect_book_id' })
  suspectBookId: string;

  @Column({ name: 'original_book_id' })
  originalBookId: string;

  @CreateDateColumn({ name: 'detected_at' })
  detectedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @Column({ nullable: true })
  resolution?: DuplicateResolution;

  @Column({ name: 'resolved_by_user_id', nullable: true })
  resolvedByUserId?: string;

  @ManyToOne(() => BookEntity, { eager: true, nullable: false })
  suspectBook: BookEntity;

  @ManyToOne(() => BookEntity, { eager: true, nullable: false })
  originalBook: BookEntity;
}
