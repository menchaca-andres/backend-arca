import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Boleta } from './boleta.entity';

@Entity('boleta_pdf')
export class BoletaPdf {
  @PrimaryColumn('uuid')
  boletaId!: string;

  @OneToOne(() => Boleta)
  @JoinColumn()
  boleta!: Boleta;

  @Column('bytea', { select: false })
  contenido!: Buffer;

  @Column('int')
  tamanoBytes!: number;
}
