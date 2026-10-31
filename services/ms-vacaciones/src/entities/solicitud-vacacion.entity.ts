import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoSolicitud } from '@arca/shared';

@Entity('solicitud_vacacion')
@Index(['funcionarioId', 'estado'])
@Index(['estado', 'createdAt'])
@Check('ck_solicitud_fechas', '"fecha_fin" >= "fecha_inicio"')
@Check('ck_solicitud_dias_habiles', '"dias_habiles" > 0')
@Check('ck_solicitud_motivo_rechazo', `"estado" <> 'RECHAZADA' OR "motivo_rechazo" IS NOT NULL`)
@Check('ck_solicitud_resolucion', `"estado" = 'PENDIENTE' OR ("resuelto_por" IS NOT NULL AND "fecha_resolucion" IS NOT NULL)`)
export class SolicitudVacacion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  funcionarioId!: string;

  @Column('varchar', { length: 200 })
  funcionarioNombre!: string;

  @Column('date')
  fechaInicio!: string;

  @Column('date')
  fechaFin!: string;

  @Column('smallint')
  diasHabiles!: number;

  @Column({ type: 'enum', enum: EstadoSolicitud, enumName: 'estado_solicitud', default: EstadoSolicitud.PENDIENTE })
  estado!: EstadoSolicitud;

  @Column('varchar', { length: 300, nullable: true })
  motivoRechazo!: string | null;

  @Index()
  @Column('uuid')
  registradoPor!: string;

  @Index()
  @Column('uuid', { nullable: true })
  resueltoPor!: string | null;

  @Column('timestamptz', { nullable: true })
  fechaResolucion!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
