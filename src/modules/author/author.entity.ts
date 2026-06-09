import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AuthorEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  biography: string | null;

  @Column({ type: 'text', name: 'profile_picture_url', nullable: true })
  profilePictureUrl: string | null;

  bookCount?: number;
}
