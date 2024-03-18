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
import { SwapOffer } from '@src/swap-offer/swap-offer.entity';
import { User } from '@src/user/user.entity';

@Entity('point')
export class Point {
  @Exclude({ toPlainOnly: true })
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ApiProperty({ description: `Unique uuid`, maximum: 36 })
  @Column({ type: 'varchar', nullable: false, length: 36 })
  uuid: string;

  @ApiProperty({ description: `Amount`, maximum: 36 })
  @Column({ type: 'integer', nullable: false })
  amount: number;

  @Column({ type: 'integer', nullable: false })
  collectionId: number;

  @ManyToOne(() => SwapOffer, (swapOffer) => swapOffer.point)
  swapOffer: SwapOffer;

  @ManyToOne(() => User, (user) => user.point)
  user: User;

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
