import { ApiProperty } from '@nestjs/swagger';

import {
  CollectionInfo,
  UserInfo,
} from '@src/buy-now-activity/buy-now-activity.type';

export class InscriptionInfo {
  @ApiProperty({ description: `Inscription id` })
  inscriptionId: string;

  @ApiProperty({ description: `Collection info` })
  collection: CollectionInfo;

  @ApiProperty({ description: `User info` })
  user: UserInfo;
}
