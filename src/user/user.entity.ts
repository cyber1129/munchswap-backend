import { ApiProperty } from '@nestjs/swagger';
import { SwapOffer } from '@src/swap-offer/swap-offer.entity';
import { Exclude } from 'class-transformer';
import {
  CreateDateColumn,
  Column,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum WalletTypes {
  UNISAT = 'Unisat',
  XVERSE = 'Xverse',
  HIRO = 'Hiro',
}

export enum Role {
  CUSTOMER = 'Customer',
  ADMIN = 'Admin',
}

@Entity('user')
export class User {
  @Exclude({ toPlainOnly: true })
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ApiProperty({ description: `Unique uuid`, maximum: 36 })
  @Column({ type: 'varchar', nullable: false, length: 36 })
  uuid: string;

  @ApiProperty({ description: 'Public key', maximum: 255, required: false })
  @Column({
    type: 'varchar',
    nullable: true,
    length: 255,
  })
  pubkey: string;

  @ApiProperty({ description: 'Address', maximum: 255, required: false })
  @Column({ type: 'varchar', nullable: false, length: 255 })
  address: string;

  @ApiProperty({
    description: 'Payment Address',
    maximum: 255,
    required: false,
  })
  @Column({ type: 'varchar', nullable: true, length: 255, default: '' })
  paymentAddress: string;

  @ApiProperty({ description: 'Wallet type', maximum: 255, required: false })
  @Column({ type: 'enum', enum: WalletTypes, nullable: true })
  walletType: WalletTypes;

  @ApiProperty({ description: 'Role', maximum: 255, required: false })
  @Column({ type: 'enum', enum: Role, nullable: false, default: Role.CUSTOMER })
  role: Role;

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

  @OneToMany(() => SwapOffer, (swapOffer) => swapOffer.buyer)
  buyerswapOffer: SwapOffer;

  @OneToMany(() => SwapOffer, (swapOffer) => swapOffer.seller)
  sellerswapOffer: SwapOffer;
}
