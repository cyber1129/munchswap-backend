import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  CreateDateColumn,
  Column,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';

import { Inscription } from '@src/inscription/inscription.entity';
import { SwapOffer } from './swap-offer.entity';

@Entity('swap_inscription')
export class SwapInscription {
  @Exclude({ toPlainOnly: true })
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ApiProperty({ description: `Unique uuid`, maximum: 36 })
  @Column({ type: 'varchar', nullable: false, length: 36 })
  uuid: string;

  @Column({ type: 'integer', nullable: false })
  swap_offer_id: number;

  @Column({ type: 'integer', nullable: false })
  inscriptionId: number;

  @ManyToOne(() => SwapOffer, (swapOffer) => swapOffer.swapInscription)
  swapOffer: SwapOffer;

  @ManyToOne(() => Inscription, (inscription) => inscription.swapInscription)
  inscription: Inscription;

  @ApiProperty({
    description: 'Date when the user was created',
    required: true,
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Date when user was updated the last time',
    required: false,
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude({ toPlainOnly: true })
  @DeleteDateColumn()
  deletedAt: Date;
}
