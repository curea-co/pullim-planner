import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import databaseConfig from "../database.config";

/**
 * `databaseConfig` 네임스페이스를 제공하는 래퍼 모듈.
 *
 * `DatabaseModule` 이 `TypeOrmModule.forRootAsync({ inject: [databaseConfig.KEY] })`
 * 로 본 provider 를 주입하려면, `ConfigModule.forFeature(databaseConfig)` 를 import 하는
 * 것만으로는 부족하고 **`exports` 까지 해야** 소비 모듈에서 `databaseConfig.KEY` 가 해석된다.
 * (전역 `load` 에 등록돼 있어도, 본 모듈 경계를 통한 명시적 export 로 DI 를 견고하게 둔다 —
 * codex R12 지적.)
 */
@Module({
  imports: [ConfigModule.forFeature(databaseConfig)],
  exports: [ConfigModule],
})
export class DatabaseConfigModule {}
