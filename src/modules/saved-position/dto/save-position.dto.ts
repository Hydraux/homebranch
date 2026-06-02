import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SavePositionDto {
  @IsNotEmpty({ message: 'Position is required' })
  @IsString({ message: 'Invalid position' })
  position: string;

  @IsNotEmpty({ message: 'Device name is required' })
  @IsString({ message: 'Invalid device name' })
  deviceName: string;

  @IsOptional()
  @IsNumber({}, { message: 'Invalid percentage' })
  @Min(0, { message: 'Percentage must be between 0 and 1' })
  @Max(1, { message: 'Percentage must be between 0 and 1' })
  percentage?: number;
}
