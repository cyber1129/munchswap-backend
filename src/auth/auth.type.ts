import { ApiProperty } from '@nestjs/swagger';

import { Role } from '@src/user/user.entity';

export interface AccessTokenInterface {
  uuid: string;
  address: string;
  role: Role;
}

export class AccessToken {
  @ApiProperty({ description: `Access Token` })
  accessToken: string;
}

export class GenerateMessage {
  @ApiProperty({ description: `message for bip322 signature` })
  message: string;
}
