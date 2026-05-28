import type { ConfigType } from "@nestjs/config";
import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { Environment } from "../constants/environment.constant";
import appConfig from "../../config/app.config";

const SWAGGER_ENABLED_ENVS: string[] = [
  Environment.LOCALHOST,
  Environment.TEST,
  Environment.DEVELOPMENT,
];

/**
 * Swagger API 문서를 생성하고 `/api-docs` 경로에 마운트한다.
 * localhost, test, development 환경에서만 활성화되며 production에서는 비활성화된다.
 * @param app - NestJS 애플리케이션 인스턴스
 */
export function setupSwagger(app: INestApplication): void {
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  if (!SWAGGER_ENABLED_ENVS.includes(config.nodeEnv)) {
    return;
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Pullim Planner API")
    .setDescription("풀림 플래너 백엔드 API 문서")
    .setVersion("0.1")
    .addApiKey(
      {
        type: "apiKey",
        in: "header",
        name: "X-User-Id",
        description:
          "Mock 인증 헤더. fallback: student_001. Phase η에서 실인증으로 교체.",
      },
      "mock-user",
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api-docs", app, document);
}
