import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";

import { setupGlobal } from "./common/bootstrap/setup-global";
import { setupLogging } from "./common/bootstrap/setup-logging";
import { setupSecurity } from "./common/bootstrap/setup-security";
import { setupSwagger } from "./common/bootstrap/setup-swagger";
import { DEFAULT_PORT } from "./common/constants/server.constant";
import "./config/timezone.config";

import { AppModule } from "./app.module";

/**
 * NestJS 애플리케이션을 생성하고 글로벌 설정을 적용한 뒤 서버를 시작한다.
 * 호출 순서: setupSecurity → setupGlobal → setupLogging → setupSwagger (pullim 본체 컨벤션 동일).
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  setupSecurity(app);
  setupGlobal(app);
  setupLogging(app);
  setupSwagger(app);

  const port = configService.get<number>("PORT", DEFAULT_PORT);
  await app.listen(port);
  console.log(`[pullim-planner/backend] listening on :${port}`);
}

void bootstrap();
