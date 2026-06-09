import { IsOptional, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginatedQuery {
  @IsOptional()
  @Type(() => Number)
  @IsPositive({ message: 'Limit must be positive' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0, { message: 'Offset must be at least 0' })
  offset?: number;

  @IsOptional()
  query?: string;
}
