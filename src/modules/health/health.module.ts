import { Module } from '@nestjs/common';
import { HealthController } from 'src/modules/health/health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
