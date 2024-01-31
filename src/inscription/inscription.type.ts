import { ApiProperty } from '@nestjs/swagger';

export class InscriptionInfo {
  @ApiProperty({ description: `Inscription id` })
  inscriptionId: string;
}
