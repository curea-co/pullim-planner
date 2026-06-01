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

  // `ConfigService.get<number>("PORT")` 는 타입 인자만 붙는 것이지 런타임 coercion이
  // 보장되지 않는다. env 문자열을 그대로 `app.listen()`에 넘기면 Node가 TCP 포트가 아니라
  // 소켓 경로로 해석할 여지가 있어 `Number(...)` 변환을 명시한다.
  const rawPort = configService.get<string | number>("PORT");
  const port =
    typeof rawPort === "number"
      ? rawPort
      : rawPort !== undefined && rawPort !== ""
        ? Number(rawPort)
        : DEFAULT_PORT;
  if (!Number.isFinite(port)) {
    throw new Error(
      `[pullim-planner/backend] Invalid PORT value: ${String(rawPort)}`,
    );
  }
  await app.listen(port);
  console.log(`[pullim-planner/backend] listening on :${port}`);
}

void bootstrap();
