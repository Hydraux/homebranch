import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BookEntity } from "src/infrastructure/database/book.entity";

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const isProduction = configService.get<string>('NODE_ENV') === 'production';
                
                // Validate required environment variables
                const username = configService.get<string>('DATABASE_USERNAME');
                const password = configService.get<string>('DATABASE_PASSWORD');
                
                if (!username || !password) {
                    throw new Error(
                        `Missing database credentials. ` +
                        `USERNAME: ${!!username}, PASSWORD: ${!!password}`
                    );
                }
                
                return {
                    type: "postgres",
                    host: configService.get<string>('DATABASE_HOST', 'localhost'),
                    port: configService.get<number>('DATABASE_PORT', 5432),
                    username: username,
                    password: password,
                    database: configService.get<string>('DATABASE_NAME', 'homebranch'),
                    entities: [BookEntity],
                    synchronize: !isProduction,
                    logging: !isProduction,
                };
            },
            inject: [ConfigService],
        })
    ],
})
export class TypeOrmConfigModule {}