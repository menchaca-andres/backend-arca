import { Check, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { RolUsuario } from '@arca/shared';

@Entity('usuario')
@Check('ck_usuario_funcionario_vinculado', `"rol" <> 'FUNCIONARIO' OR "funcionario_id" IS NOT NULL`)
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 150, unique: true })
  email!: string;

  @Column('varchar', { length: 100, select: false })
  passwordHash!: string;

  @Column({ type: 'enum', enum: RolUsuario, enumName: 'rol_usuario' })
  rol!: RolUsuario;

  @Column('uuid', { nullable: true, unique: true })
  funcionarioId!: string | null;

  @Column('boolean', { default: true })
  activo!: boolean;

  @Column('smallint', { default: 0 })
  intentosFallidos!: number;

  @Column('timestamptz', { nullable: true })
  bloqueadoHasta!: Date | null;

  @Column('timestamptz', { nullable: true })
  ultimoAcceso!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
