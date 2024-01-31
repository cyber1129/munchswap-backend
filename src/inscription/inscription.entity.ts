import {
  CreateDateColumn,
  Column,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { Collection } from '@src/collection/collection.entity';
import { BuyerSwapInscription } from '@src/swap-offer/buyer-swap-inscription.entity';
import { SellerSwapInscription } from '@src/swap-offer/seller-swap-inscription.entity';

@Entity('inscription')
export class Inscription {
  @Exclude({ toPlainOnly: true })
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ApiProperty({ description: `Unique uuid`, maximum: 36 })
  @Column({ type: 'varchar', nullable: false, length: 36 })
  uuid: string;

  @ApiProperty({ description: `Inscription Id`, maximum: 36 })
  @Column({ type: 'varchar', nullable: false })
  inscriptionId: string;

  @Column({ type: 'integer', nullable: false })
  collectionId: number;

  @ManyToOne(() => Collection, (collection) => collection.inscription)
  collection: Collection;

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

  @OneToMany(
    () => BuyerSwapInscription,
    (buyerSwapInscription) => buyerSwapInscription.inscription,
  )
  buyerSwapInscription: BuyerSwapInscription[];

  @OneToMany(
    () => SellerSwapInscription,
    (sellerSwapInscription) => sellerSwapInscription.inscription,
  )
  sellerSwapInscription: SellerSwapInscription[];
}
