import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Plantilla } from './plantilla.entity';

@Entity('plantilla_version')
@Unique('uq_plantilla_version', ['plantillaId', 'version'])
@Index('ux_plantilla_version_activa', ['plantillaId'], { unique: true, where: '"activa" = true' })
export class PlantillaVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  plantillaId!: string;

  @ManyToOne(() => Plantilla)
  @JoinColumn()
  plantilla!: Plantilla;

  @Column('int')
  version!: number;

  @Column('text')
  contenido!: string;

  @Column('jsonb')
  variables!: string[];

  @Column('boolean')
  activa!: boolean;

  @Index()
  @Column('uuid')
  creadoPor!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
