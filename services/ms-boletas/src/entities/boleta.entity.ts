import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoBoleta, numericTransformer } from '@arca/shared';
import { Periodo } from './periodo.entity';

@Entity('boleta')
@Index('ux_boleta_vigente', ['periodoId', 'funcionarioId'], { unique: true, where: `"estado" <> 'RECTIFICADA'` })
@Check('ck_boleta_emision', `"estado" = 'BORRADOR' OR ("numero" IS NOT NULL AND "hash_sha256" IS NOT NULL AND "emitida_en" IS NOT NULL)`)
@Check('ck_boleta_liquido', `"estado" = 'BORRADOR' OR "liquido_pagable" >= 0`)
@Check('ck_boleta_rectificacion', '"version" = 1 OR ("boleta_original_id" IS NOT NULL AND "motivo_rectificacion" IS NOT NULL)')
@Check('ck_boleta_dias_trabajados', '"dias_trabajados" BETWEEN 0 AND 30')
export class Boleta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  periodoId!: string;

  @ManyToOne(() => Periodo)
  @JoinColumn()
  periodo!: Periodo;

  @Index()
  @Column('uuid')
  funcionarioId!: string;

  @Column('varchar', { length: 20, nullable: true, unique: true })
  numero!: string | null;

  @Column('smallint', { default: 1 })
  version!: number;

  @Column({ type: 'enum', enum: EstadoBoleta, enumName: 'estado_boleta', default: EstadoBoleta.BORRADOR })
  estado!: EstadoBoleta;

  @Column('uuid', { nullable: true })
  boletaOriginalId!: string | null;

  @ManyToOne(() => Boleta, { nullable: true })
  @JoinColumn()
  boletaOriginal!: Boleta | null;

  @Column('varchar', { length: 300, nullable: true })
  motivoRectificacion!: string | null;

  @Column('jsonb')
  datosFuncionario!: Record<string, unknown>;

  @Column('smallint')
  diasTrabajados!: number;

  @Column('numeric', { precision: 12, scale: 2, transformer: numericTransformer })
  totalGanado!: number;

  @Column('numeric', { precision: 12, scale: 2, transformer: numericTransformer })
  totalDescuentos!: number;

  @Column('numeric', { precision: 12, scale: 2, transformer: numericTransformer })
  liquidoPagable!: number;

  @Column('boolean')
  tieneAlerta!: boolean;

  @Column('char', { length: 64, nullable: true })
  hashSha256!: string | null;

  @Column('timestamptz', { nullable: true })
  emitidaEn!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
