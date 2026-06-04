import { Module } from '@nestjs/common';
import { SajuService } from './saju.service';

@Module({
  providers: [SajuService],
  exports: [SajuService],
})
export class SajuModule {}
