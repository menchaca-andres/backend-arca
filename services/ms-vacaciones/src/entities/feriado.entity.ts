import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('feriado')
export class Feriado {
  @PrimaryColumn('date')
  fecha!: string;

  @Column('varchar', { length: 100 })
  descripcion!: string;
}
