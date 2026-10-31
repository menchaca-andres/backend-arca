import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Contrato } from './contrato.entity';

@Entity('contrato_pdf')
export class ContratoPdf {
  @PrimaryColumn('uuid')
  contratoId!: string;

  @OneToOne(() => Contrato)
  @JoinColumn()
  contrato!: Contrato;

  @Column('bytea', { select: false })
  contenido!: Buffer;

  @Column('int')
  tamanoBytes!: number;
}
