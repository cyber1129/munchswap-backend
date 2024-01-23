import { ApiProperty } from '@nestjs/swagger';

export class SendFriendRequest {
  @ApiProperty({ description: `Uploaded image url` })
  msg: string;
}
