import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingEntity } from 'src/modules/settings/setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingEntity)
    private readonly settingsRepository: Repository<SettingEntity>,
  ) {}

  async getByKey(key: string): Promise<SettingEntity> {
    const setting = await this.settingsRepository.findOneBy({ key });
    if (!setting) {
      throw new NotFoundException('Setting not found');
    }
    return setting;
  }

  async getOptionalValue(key: string): Promise<string | undefined> {
    const setting = await this.settingsRepository.findOneBy({ key });
    return setting?.value;
  }

  async upsert(key: string, value: string): Promise<SettingEntity> {
    return this.settingsRepository.save({ key, value });
  }
}
