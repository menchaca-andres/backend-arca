import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('correlativo')
export class Correlativo {
  @PrimaryColumn('varchar', { length: 10 })
  tipo!: string;

  @PrimaryColumn('smallint')
  anio!: number;

  @Column('int')
  ultimo!: number;
}
