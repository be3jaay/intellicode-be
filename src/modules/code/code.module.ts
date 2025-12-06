import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CodeController } from './code.controller';
import { CodeService } from './code.service';

@Module({
  imports: [ConfigModule],
  controllers: [CodeController],
  providers: [CodeService],
  exports: [CodeService],
})
export class CodeModule {}
