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
    // X-User-Id 를 보안 요구사항(security)이 아니라 모든 operation 의 **선택 헤더
    // 파라미터**로 등록한다. try-it-out 시 헤더가 전송되면서도(R5 해소), public(@Public)
    // 라우트까지 인증 필수로 OpenAPI 계약이 굳는 문제(R7)를 피한다. MockAuthGuard 는
    // 헤더 부재 시 student_001 로 fallback 하므로 required=false 가 실제 동작과 일치한다.
    .addGlobalParameters({
      name: "X-User-Id",
      in: "header",
      required: false,
      description:
        "Mock 인증 헤더. 미전송 시 fallback: student_001. Phase η에서 실인증으로 교체.",
      schema: { type: "string" },
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api-docs", app, document);
}
