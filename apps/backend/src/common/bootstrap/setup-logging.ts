import { INestApplication, Logger } from "@nestjs/common";
import { ClsService } from "nestjs-cls";

/**
 * Request ID(cls) 기반 간이 HTTP 요청 로깅을 설정한다.
 *
 * Phase β 시점에서는 pullim 본체처럼 Winston/Morgan을 도입하지 않고 NestJS 내장 Logger를
 * 활용한다 — planner 단일 도메인 + 로컬 개발 위주이므로 의존성 최소화. 향후 운영 단계에서
 * pullim과 동일한 Winston JSON 로깅으로 전환 가능 (pullim `common/logger/` 패턴 참조).
 *
 * @param app - NestJS 애플리케이션 인스턴스
 */
export function setupLogging(app: INestApplication): void {
  const logger = new Logger("HTTP");
  const clsService = app.get(ClsService);

  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance() as unknown as {
    use: (handler: (...args: unknown[]) => unknown) => void;
  };

  if (typeof instance?.use !== "function") {
    return;
  }

  instance.use((req: unknown, res: unknown, next: () => void) => {
    const start = Date.now();
    const request = req as { method: string; originalUrl: string };
    const response = res as {
      on: (event: string, cb: () => void) => void;
      statusCode: number;
    };

    response.on("finish", () => {
      const elapsed = Date.now() - start;
      let requestId = "N/A";
      try {
        requestId = clsService.getId() ?? "N/A";
      } catch {
        requestId = "N/A";
      }
      logger.log(
        `REQ[${requestId}] ${request.method} ${request.originalUrl} ${response.statusCode} - ${elapsed}ms`,
      );
    });

    next();
  });
}
