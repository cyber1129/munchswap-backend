import {
  CreateDateColumn,
  Column,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { User } from '@src/user/user.entity';
import { BuyNowActivity } from '@src/buy-now-activity/buy-now-activity.entity';

export enum OfferStatus {
  CREATED = 'created', // created the psbt
  SIGNED = 'signed', //buy signed the psbt
  ACCEPTED = 'accepted', // owner signed the psbt
  PUSHED = 'pushed', // combine and pushed
  FAILED = 'failed', // failed when push transaction
  CANCELED = 'canceled', // canceled by owner
  EXPIRED = 'expired', // expired
}

@Entity('buy_now_offer')
export class BuyNowOffer {
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

  @ApiProperty({ description: 'Activity notification is read', required: true })
  @Column({
    type: 'boolean',
    nullable: false,
    default: true,
  })
  isRead: boolean;

  @Column({ type: 'integer', nullable: false })
  userId: number;

  @Column({ type: 'integer', nullable: false })
  buyNowActivityId: number;

  @ApiProperty({ description: `psbt`, maximum: 5000 })
  @Column({
    type: 'varchar',
    nullable: false,
    length: 5000,
    default: OfferStatus.CREATED,
  })
  psbt: string;

  @ApiProperty({ description: `User signed psbt`, maximum: 5000 })
  @Column({ type: 'varchar', nullable: true, length: 5000 })
  userSignedPsbt: string;

  @ApiProperty({ description: `Buyer signed psbt`, maximum: 5000 })
  @Column({ type: 'varchar', nullable: true, length: 5000 })
  buyerSignedPsbt: string;

  @Column({
    type: 'timestamp',
    nullable: false,
    default: new Date(),
  })
  expiredAt: Date;

  @ManyToOne(() => User, (user) => user.buyNowOffer)
  user: User;

  @ManyToOne(
    () => BuyNowActivity,
    (buyNowActivity) => buyNowActivity.buyNowOffer,
  )
  buyNowActivity: BuyNowActivity;

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
