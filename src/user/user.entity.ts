import { ApiProperty } from '@nestjs/swagger';
import { Point } from '@src/point/point.entity';
import { SwapOffer } from '@src/swap-offer/swap-offer.entity';
import { Wallet } from '@src/wallet/wallet.entity';
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

  @ApiProperty({ description: `Name`, maximum: 100 })
  @Column({ type: 'varchar', nullable: true, length: 100 })
  name: string;

  @ApiProperty({ description: `Avatar inscription url`, maximum: 100 })
  @Column({ type: 'varchar', nullable: true, length: 100 })
  avatar: string;

  @ApiProperty({ description: 'Role', maximum: 255, required: false })
  @Column({ type: 'enum', enum: Role, nullable: false, default: Role.CUSTOMER })
  role: Role;

  @OneToMany(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet[];

  @OneToMany(() => Point, (point) => point.user)
  point: Point[];

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
