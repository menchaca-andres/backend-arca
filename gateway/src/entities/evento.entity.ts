import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('evento')
@Index(['fecha'])
@Index(['usuarioId', 'fecha'])
@Index(['servicio', 'fecha'])
export class Evento {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha!: Date;

  @Column('uuid', { nullable: true })
  usuarioId!: string | null;

  @Column('varchar', { length: 20, nullable: true })
  rol!: string | null;

  @Column('varchar', { length: 7 })
  metodo!: string;

  @Column('varchar', { length: 300 })
  ruta!: string;

  @Column('varchar', { length: 30 })
  servicio!: string;

  @Column('varchar', { length: 64, nullable: true })
  recursoId!: string | null;

  @Column('smallint')
  statusCode!: number;

  @Column('inet', { nullable: true })
  ip!: string | null;

  @Column('uuid')
  requestId!: string;
}
