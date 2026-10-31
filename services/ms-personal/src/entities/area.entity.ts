import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('area')
export class Area {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 20, unique: true })
  codigo!: string;

  @Column('varchar', { length: 100, unique: true })
  nombre!: string;

  @Column('boolean', { default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
