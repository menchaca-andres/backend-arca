import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TipoConcepto, numericTransformer } from '@arca/shared';
import { Boleta } from './boleta.entity';
import { Concepto } from './concepto.entity';

@Entity('boleta_detalle')
export class BoletaDetalle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  boletaId!: string;

  @ManyToOne(() => Boleta, { onDelete: 'CASCADE' })
  @JoinColumn()
  boleta!: Boleta;

  @Column('uuid')
  conceptoId!: string;

  @ManyToOne(() => Concepto, { onDelete: 'RESTRICT' })
  @JoinColumn()
  concepto!: Concepto;

  @Column('varchar', { length: 20 })
  conceptoCodigo!: string;

  @Column('varchar', { length: 100 })
  conceptoNombre!: string;

  @Column({ type: 'enum', enum: TipoConcepto, enumName: 'tipo_concepto' })
  tipo!: TipoConcepto;

  @Column('numeric', { precision: 12, scale: 2, nullable: true, transformer: numericTransformer })
  baseMonto!: number | null;

  @Column('numeric', { precision: 7, scale: 4, nullable: true, transformer: numericTransformer })
  porcentaje!: number | null;

  @Column('numeric', { precision: 12, scale: 2, transformer: numericTransformer })
  monto!: number;

  @Column('smallint')
  orden!: number;
}
