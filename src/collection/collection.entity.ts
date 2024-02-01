import { ApiProperty } from '@nestjs/swagger';
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

import { Inscription } from '@src/inscription/inscription.entity';

@Entity('collection')
export class Collection {
  @Exclude({ toPlainOnly: true })
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ApiProperty({ description: `Unique uuid`, maximum: 36 })
  @Column({ type: 'varchar', nullable: false, length: 36 })
  uuid: string;

  @ApiProperty({ description: `name`, maximum: 80 })
  @Column({ type: 'varchar', nullable: true, length: 80 })
  name: string;

  @ApiProperty({ description: `Description`, maximum: 1200 })
  @Column({ type: 'varchar', nullable: true, length: 1200 })
  description: string;

  @ApiProperty({ description: `Banner Image Url`, maximum: 255 })
  @Column({ type: 'varchar', nullable: true, length: 255 })
  imgUrl: string;

  @ApiProperty({ description: `Website Url`, maximum: 255 })
  @Column({ type: 'varchar', nullable: true, length: 255 })
  website: string;

  @ApiProperty({ description: `Twitter Url`, maximum: 255 })
  @Column({ type: 'varchar', nullable: true, length: 255 })
  twitter: string;

  @ApiProperty({ description: `Discordp Url`, maximum: 255 })
  @Column({ type: 'varchar', nullable: true, length: 255 })
  discord: string;

  @OneToMany(() => Inscription, (inscription) => inscription.collection)
  inscription: Inscription[];

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
