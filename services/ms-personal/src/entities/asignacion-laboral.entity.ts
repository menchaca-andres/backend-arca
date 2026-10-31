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
import { MotivoAsignacion, numericTransformer } from '@arca/shared';
import { Cargo } from './cargo.entity';
import { Funcionario } from './funcionario.entity';

@Entity('asignacion_laboral')
@Index('ux_asignacion_vigente', ['funcionarioId'], { unique: true, where: '"vigente_hasta" IS NULL' })
@Check('ck_asignacion_remuneracion', '"remuneracion" > 0')
@Check('ck_asignacion_vigencia', '"vigente_hasta" IS NULL OR "vigente_hasta" >= "vigente_desde"')
export class AsignacionLaboral {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  funcionarioId!: string;

  @ManyToOne(() => Funcionario)
  @JoinColumn()
  funcionario!: Funcionario;

  @Column('uuid')
  cargoId!: string;

  @ManyToOne(() => Cargo)
  @JoinColumn()
  cargo!: Cargo;

  @Column('numeric', { precision: 12, scale: 2, transformer: numericTransformer })
  remuneracion!: number;

  @Column('date')
  vigenteDesde!: string;

  @Column('date', { nullable: true })
  vigenteHasta!: string | null;

  @Column({ type: 'enum', enum: MotivoAsignacion, enumName: 'motivo_asignacion' })
  motivo!: MotivoAsignacion;

  @Index()
  @Column('uuid')
  registradoPor!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
