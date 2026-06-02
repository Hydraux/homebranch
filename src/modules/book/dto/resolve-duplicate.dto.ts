import { IsIn } from 'class-validator';
import { DuplicateResolution } from 'src/modules/book/deduplication/book-duplicate.entity';

export class ResolveDuplicateDto {
  @IsIn(['merge', 'keep_both', 'replace'])
  action: DuplicateResolution;
}
