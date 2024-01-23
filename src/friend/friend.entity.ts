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

export enum FriendStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
  IGNORE = 'ignore',
  UNBLOCK = 'unblock',
}

@Entity('friend')
export class Friend {
  @Exclude({ toPlainOnly: true })
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ApiProperty({ description: `Unique uuid`, maximum: 36 })
  @Column({ type: 'varchar', nullable: false, length: 36 })
  uuid: string;

  @Column({ type: 'integer', nullable: false })
  senderId: number;

  @Column({ type: 'integer', nullable: false })
  receiverId: number;

  @ManyToOne(() => User, (user) => user.sender)
  sender: User;

  @ManyToOne(() => User, (user) => user.receiver)
  receiver: User;

  @ApiProperty({ description: 'Status', maximum: 255, required: true })
  @Column({ type: 'enum', enum: FriendStatus, nullable: false })
  status: FriendStatus;

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
