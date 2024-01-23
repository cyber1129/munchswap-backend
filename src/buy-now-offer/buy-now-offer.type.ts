import { ApiProperty } from '@nestjs/swagger';

export class GeneratePbst {
  @ApiProperty({ description: `Generated psbt` })
  psbt: string;

  @ApiProperty({ description: `Input count of psbt` })
  inputCount: number;
}

export class SignPsbtResult {
  @ApiProperty({ description: `Sign pbst result` })
  msg: string;
}

export class PushTxResult extends SignPsbtResult {
  @ApiProperty({ description: `Transaction id` })
  txId: string;
}
