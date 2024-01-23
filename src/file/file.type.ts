import { ApiProperty } from '@nestjs/swagger';

export class UploadImage {
  @ApiProperty({ description: `Uploaded image url` })
  imageUrl: string;
}
