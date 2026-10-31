import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoPeriodo } from '@arca/shared';

@Entity('periodo')
@Unique('uq_periodo_anio_mes', ['anio', 'mes'])
@Check('ck_periodo_mes', '"mes" BETWEEN 1 AND 12')
export class Periodo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('smallint')
  anio!: number;

  @Column('smallint')
  mes!: number;

  @Column({ type: 'enum', enum: EstadoPeriodo, enumName: 'estado_periodo', default: EstadoPeriodo.BORRADOR })
  estado!: EstadoPeriodo;

  @Column('timestamptz', { nullable: true })
  fechaCalculo!: Date | null;

  @Column('timestamptz', { nullable: true })
  fechaEmision!: Date | null;

  @Index()
  @Column('uuid', { nullable: true })
  emitidoPor!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
