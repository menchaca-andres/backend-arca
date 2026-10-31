import { Check, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BaseCalculo, FormaCalculo, TipoConcepto, numericTransformer } from '@arca/shared';

@Entity('concepto')
@Check('ck_concepto_porcentaje', `"forma_calculo" <> 'PORCENTAJE' OR ("valor" BETWEEN 0 AND 100 AND "base" IS NOT NULL)`)
@Check('ck_concepto_monto_fijo', `"forma_calculo" <> 'MONTO_FIJO' OR "valor" > 0`)
@Check('ck_concepto_sistema', `"forma_calculo" <> 'SISTEMA' OR ("valor" IS NULL AND "base" IS NULL)`)
export class Concepto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 20, unique: true })
  codigo!: string;

  @Column('varchar', { length: 100 })
  nombre!: string;

  @Column({ type: 'enum', enum: TipoConcepto, enumName: 'tipo_concepto' })
  tipo!: TipoConcepto;

  @Column({ type: 'enum', enum: FormaCalculo, enumName: 'forma_calculo' })
  formaCalculo!: FormaCalculo;

  @Column('numeric', { precision: 12, scale: 4, nullable: true, transformer: numericTransformer })
  valor!: number | null;

  @Column({ type: 'enum', enum: BaseCalculo, enumName: 'base_calculo', nullable: true })
  base!: BaseCalculo | null;

  @Column('boolean')
  automatico!: boolean;

  @Column('boolean')
  esSistema!: boolean;

  @Column('smallint')
  orden!: number;

  @Column('boolean', { default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
