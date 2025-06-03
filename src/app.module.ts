import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmConfigModule } from "./modules/typeorm.module";
import { BooksModule } from "./modules/book.module";

@Module({
  imports: [
    // Configuration first
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // Database configuration
    TypeOrmConfigModule,
    
    // Feature modules
    BooksModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}