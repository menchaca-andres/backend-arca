import { Check, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EstadoFuncionario, MotivoBaja } from '@arca/shared';

@Entity('funcionario')
@Check('ck_funcionario_ci_expedido', `"ci_expedido" IN ('LP', 'CB', 'SC', 'OR', 'PT', 'CH', 'TJ', 'BE', 'PD')`)
@Check('ck_funcionario_sexo', `"sexo" IN ('M', 'F')`)
@Check('ck_funcionario_dias_prueba', '"dias_prueba" BETWEEN 1 AND 90')
@Check('ck_funcionario_ratificado', `"estado" <> 'RATIFICADO' OR "fecha_ratificacion" IS NOT NULL`)
@Check('ck_funcionario_baja', `"estado" <> 'BAJA' OR ("fecha_baja" IS NOT NULL AND "motivo_baja" IS NOT NULL)`)
@Check('ck_funcionario_fecha_baja', '"fecha_baja" IS NULL OR "fecha_baja" >= "fecha_ingreso"')
@Check('ck_funcionario_detalle_baja', `"motivo_baja" <> 'OTRO' OR "detalle_baja" IS NOT NULL`)
export class Funcionario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 15, unique: true })
  ci!: string;

  @Column('varchar', { length: 2 })
  ciExpedido!: string;

  @Column('varchar', { length: 100 })
  nombres!: string;

  @Column('varchar', { length: 100 })
  apellidos!: string;

  @Column('date')
  fechaNacimiento!: string;

  @Column('char', { length: 1 })
  sexo!: string;

  @Column('varchar', { length: 150, nullable: true })
  correo!: string | null;

  @Column('varchar', { length: 20, nullable: true })
  telefono!: string | null;

  @Column('varchar', { length: 200, nullable: true })
  direccion!: string | null;

  @Column('date')
  fechaIngreso!: string;

  @Column('smallint', { default: 90 })
  diasPrueba!: number;

  @Column({ type: 'enum', enum: EstadoFuncionario, enumName: 'estado_funcionario', default: EstadoFuncionario.EN_PRUEBA })
  estado!: EstadoFuncionario;

  @Column('date', { nullable: true })
  fechaRatificacion!: string | null;

  @Column('date', { nullable: true })
  fechaBaja!: string | null;

  @Column({ type: 'enum', enum: MotivoBaja, enumName: 'motivo_baja', nullable: true })
  motivoBaja!: MotivoBaja | null;

  @Column('varchar', { length: 300, nullable: true })
  detalleBaja!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
