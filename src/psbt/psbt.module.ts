import { Module } from '@nestjs/common';

import { PsbtService } from './psbt.service';

@Module({
  providers: [PsbtService],
})
export class PsbtModule {}
