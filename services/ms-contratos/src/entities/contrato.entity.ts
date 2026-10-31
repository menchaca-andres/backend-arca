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
import { EstadoContrato } from '@arca/shared';
import { PlantillaVersion } from './plantilla-version.entity';

@Entity('contrato')
@Unique('uq_contrato_funcionario_version', ['funcionarioId', 'version'])
@Index('ux_contrato_vigente', ['funcionarioId'], { unique: true, where: `"estado" = 'VIGENTE'` })
export class Contrato {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 20, unique: true })
  numero!: string;

  @Index()
  @Column('uuid')
  funcionarioId!: string;

  @Column('uuid')
  plantillaVersionId!: string;

  @ManyToOne(() => PlantillaVersion)
  @JoinColumn()
  plantillaVersion!: PlantillaVersion;

  @Column('int')
  version!: number;

  @Column({ type: 'enum', enum: EstadoContrato, enumName: 'estado_contrato' })
  estado!: EstadoContrato;

  @Column('jsonb')
  datos!: Record<string, unknown>;

  @Column('text')
  contenidoRenderizado!: string;

  @Column('char', { length: 64 })
  hashSha256!: string;

  @Index()
  @Column('uuid')
  generadoPor!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
