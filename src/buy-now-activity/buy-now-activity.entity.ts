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

import { BuyNowOffer } from '@src/buy-now-offer/buy-now-offer.entity';
import { Inscription } from '@src/inscription/inscription.entity';
import { User } from '@src/user/user.entity';

export enum ActivityStatus {
  CREATED = 'created', // created the psbt
  COMPLETED = 'completed', //buy signed the psbt
  REMOVED = 'removed', // owner signed the psbt
}

@Entity('buy_now_activity')
export class BuyNowActivity {
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
  @Column({
    type: 'enum',
    enum: ActivityStatus,
    nullable: false,
    default: ActivityStatus.CREATED,
  })
  status: ActivityStatus;

  @Column({ type: 'integer', nullable: false })
  inscriptionId: number;

  @Column({ type: 'integer', nullable: false })
  userId: number;

  @ManyToOne(() => User, (user) => user.buyNowActivity)
  user: User;

  @ManyToOne(() => Inscription, (inscription) => inscription.buyNowActivity)
  inscription: Inscription;

  @OneToMany(() => BuyNowOffer, (buyNowOffer) => buyNowOffer.buyNowActivity)
  buyNowOffer: BuyNowOffer[];

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
