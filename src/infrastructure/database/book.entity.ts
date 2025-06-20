import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class BookEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column()
    author: string;

    @Column({ name: 'published_year', nullable: true })
    publishedYear?: number;

    @Column({nullable: true })
    genre?: string;
}