import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TipoContrato } from '@arca/shared';

@Entity('plantilla')
export class Plantilla {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 30, unique: true })
  codigo!: string;

  @Column('varchar', { length: 150 })
  nombre!: string;

  @Column({ type: 'enum', enum: TipoContrato, enumName: 'tipo_contrato' })
  tipo!: TipoContrato;

  @Column('boolean', { default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
