import type { ConfigType } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";

import { BODY_SIZE_LIMIT } from "../constants/security.constant";
import appConfig from "../../config/app.config";

/**
 * CORS, Helmet, Body size limit, Trust Proxy 등 보안 관련 미들웨어를 설정한다.
 * @param app - NestJS 애플리케이션 인스턴스
 */
export function setupSecurity(app: NestExpressApplication): void {
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  // 리버스 프록시 뒤에서 클라이언트 IP를 올바르게 추출하기 위한 trust proxy 설정.
  if (config.trustProxyHops > 0) {
    app.set("trust proxy", config.trustProxyHops);
  }

  app.enableCors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-User-Id"],
  });

  app.use(helmet());

  app.useBodyParser("json", { limit: BODY_SIZE_LIMIT });
  app.useBodyParser("urlencoded", { limit: BODY_SIZE_LIMIT, extended: true });
}
