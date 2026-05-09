import { Module } from '@nestjs/common';
import { TotemsService } from './totems.service';
import { TotemsController } from './totems.controller';

@Module({
  providers: [TotemsService],
  controllers: [TotemsController],
  exports: [TotemsService],
})
export class TotemsModule {}
