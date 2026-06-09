import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class SettingEntity {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'text' })
  value: string;
}
