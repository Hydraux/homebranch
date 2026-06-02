import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/guards/roles.decorator';
import { UpsertSettingDto } from 'src/modules/settings/dto/upsert-setting.dto';
import { SettingsService } from 'src/modules/settings/settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(':key')
  getSetting(@Param('key') key: string) {
    return this.settingsService.getByKey(key);
  }

  @Put(':key')
  upsertSetting(@Param('key') key: string, @Body() dto: UpsertSettingDto) {
    return this.settingsService.upsert(key, dto.value);
  }
}
