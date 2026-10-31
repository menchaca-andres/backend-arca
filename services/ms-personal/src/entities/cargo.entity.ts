import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '@arca/shared';
import { Area } from './area.entity';

@Entity('cargo')
@Unique('uq_cargo_area_nombre', ['areaId', 'nombre'])
@Check('ck_cargo_salario_min', '"salario_min" > 0')
@Check('ck_cargo_banda', '"salario_min" <= "salario_max"')
export class Cargo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  areaId!: string;

  @ManyToOne(() => Area)
  @JoinColumn()
  area!: Area;

  @Column('varchar', { length: 100 })
  nombre!: string;

  @Column('numeric', { precision: 12, scale: 2, transformer: numericTransformer })
  salarioMin!: number;

  @Column('numeric', { precision: 12, scale: 2, transformer: numericTransformer })
  salarioMax!: number;

  @Column('boolean', { default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
