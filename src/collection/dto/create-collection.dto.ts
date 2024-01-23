import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCollectionDto {
  @ApiProperty({
    example: 'Blockmunchers',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Collection name',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example:
      'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://bafybeibtmemsukay4wf6wwaled4cnh7tljnzczwjssvte44a6bfw6h6eve.ipfs.nftstorage.link',
    required: false,
    minimum: 1,
    maximum: 128,
    description: '',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  imgUrl: string;

  @ApiProperty({
    example: 'Image Url',
    required: false,
    minimum: 1,
    maximum: 128,
    description: '',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1200)
  description: string;

  @ApiProperty({
    example: [
      '29cae3cba151f520b23d8649e9bb5917d9f90227536fe356689a6c76885f582ai0',
      '3de0c304b7542eddf4638a08cf02c89fc98dffa1170f3369fc44b41f25bf8442i0',
    ],
    required: false,
    minimum: 1,
    maximum: 128,
    description: '',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  inscriptionIds: string[];
}
