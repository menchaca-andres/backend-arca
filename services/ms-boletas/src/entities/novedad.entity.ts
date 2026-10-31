import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '@arca/shared';
import { Concepto } from './concepto.entity';

@Entity('novedad')
@Unique('uq_novedad', ['anio', 'mes', 'funcionarioId', 'conceptoId'])
@Check('ck_novedad_mes', '"mes" BETWEEN 1 AND 12')
@Check('ck_novedad_monto', '"monto" > 0')
export class Novedad {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('smallint')
  anio!: number;

  @Column('smallint')
  mes!: number;

  @Index()
  @Column('uuid')
  funcionarioId!: string;

  @Column('uuid')
  conceptoId!: string;

  @ManyToOne(() => Concepto, { onDelete: 'RESTRICT' })
  @JoinColumn()
  concepto!: Concepto;

  @Column('numeric', { precision: 12, scale: 2, transformer: numericTransformer })
  monto!: number;

  @Column('varchar', { length: 200, nullable: true })
  descripcion!: string | null;

  @Index()
  @Column('uuid')
  registradoPor!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
