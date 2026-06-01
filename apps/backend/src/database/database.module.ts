import { Module } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

import { BaseModelSubscriber } from "../common/subscribers/base-model.subscriber";
import databaseConfig from "../config/database.config";
import { DatabaseConfigModule } from "../config/modules/database.config.module";

@Module({
  imports: [
    DatabaseConfigModule,
    TypeOrmModule.forRootAsync({
      useFactory: (dbConfig: ConfigType<typeof databaseConfig>) => ({
        type: "postgres",
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.name,
        ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        synchronize: dbConfig.synchronize,
        migrationsRun: !dbConfig.synchronize,
        migrations: ["dist/database/migrations/**/*.js"],
        namingStrategy: new SnakeNamingStrategy(),
        subscribers: [BaseModelSubscriber],
      }),
      inject: [databaseConfig.KEY],
    }),
  ],
})
export class DatabaseModule {}
