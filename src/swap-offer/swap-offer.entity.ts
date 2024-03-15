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
import { BuyerSwapInscription } from './buyer-swap-inscription.entity';
import { SellerSwapInscription } from './seller-swap-inscription.entity';
import { User } from '@src/user/user.entity';
import { Wallet } from '@src/wallet/wallet.entity';
import { Point } from '@src/point/point.entity';

export enum OfferStatus {
  CREATED = 'created', // created the psbt
  SIGNED = 'signed', //buy signed the psbt
  ACCEPTED = 'accepted', // owner signed the psbt
  PUSHED = 'pushed', // combine and pushed
  FAILED = 'failed', // failed when push transaction
  CANCELED = 'canceled', // canceled by owner
  EXPIRED = 'expired', // expired
  PENDING = 'pending', // waiting for push tx
}

@Entity('swap_offer')
export class SwapOffer {
  @Exclude({ toPlainOnly: true })
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ApiProperty({ description: `Unique uuid`, maximum: 36 })
  @Column({ type: 'varchar', nullable: false, length: 36 })
  uuid: string;

  @ApiProperty({ description: `Buy now price`, maximum: 36 })
  @Column({ type: 'float', nullable: false })
  price: number;

  @ApiProperty({ description: 'Offer Status', maximum: 255, required: true })
  @Column({ type: 'enum', enum: OfferStatus, nullable: false })
  status: OfferStatus;

  @ApiProperty({ description: `psbt`, maximum: 5000 })
  @Column({
    type: 'varchar',
    nullable: false,
    length: 5000,
    default: OfferStatus.CREATED,
  })
  psbt: string;

  @ApiProperty({ description: `Seller signed psbt`, maximum: 5000 })
  @Column({ type: 'varchar', nullable: true, length: 5000 })
  sellerSignedPsbt: string;

  @ApiProperty({ description: `Buyer signed psbt`, maximum: 5000 })
  @Column({ type: 'varchar', nullable: true, length: 5000 })
  buyerSignedPsbt: string;

  @ApiProperty({ description: `Transaction id`, maximum: 100 })
  @Column({ type: 'varchar', nullable: true, length: 100 })
  txId: string;

  @Column({
    type: 'timestamp',
    nullable: false,
    default: new Date(),
  })
  expiredAt: Date;

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
    (buyerSwapInscription) => buyerSwapInscription.swapOffer,
  )
  buyerSwapInscription: BuyerSwapInscription[];

  @OneToMany(
    () => SellerSwapInscription,
    (sellerSwapInscription) => sellerSwapInscription.swapOffer,
  )
  sellerSwapInscription: SellerSwapInscription[];

  @OneToMany(() => Point, (point) => point.swapOffer)
  point: Point[];

  @ManyToOne(() => Wallet, (user) => user.buyerswapOffer)
  buyer: Wallet;

  @ManyToOne(() => Wallet, (user) => user.sellerswapOffer)
  seller: Wallet;
}
