import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BookCoreModule } from 'src/modules/book/book-core.module';
import { OpdsV1Builder } from 'src/modules/opds/opds-v1.builder';
import { OpdsV2Builder } from 'src/modules/opds/opds-v2.builder';
import { OpdsV1Controller } from 'src/modules/opds/opds-v1.controller';
import { OpdsV2Controller } from 'src/modules/opds/opds-v2.controller';
import { OpdsBasicAuthGuard } from 'src/common/guards/opds-basic-auth.guard';
import { BookShelvesModule } from 'src/modules/book-shelf/book-shelf.module';

@Module({
  imports: [AuthModule, BookCoreModule, BookShelvesModule],
  providers: [
    // Guard (Basic Auth → Auth service → JWT verification)
    OpdsBasicAuthGuard,

    // Builders
    OpdsV1Builder,
    OpdsV2Builder,
  ],
  controllers: [OpdsV1Controller, OpdsV2Controller],
})
export class OpdsModule {}
