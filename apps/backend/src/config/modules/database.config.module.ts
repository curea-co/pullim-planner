import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import databaseConfig from "../database.config";

@Module({
  imports: [ConfigModule.forFeature(databaseConfig)],
})
export class DatabaseConfigModule {}
