import { IsString, MinLength } from 'class-validator';

export class UpsertSettingDto {
  @IsString()
  @MinLength(1)
  value: string;
}
