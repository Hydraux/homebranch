import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingEntity } from 'src/modules/settings/setting.entity';
import { SettingsController } from 'src/modules/settings/settings.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { SettingsService } from 'src/modules/settings/settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([SettingEntity]), AuthModule],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
