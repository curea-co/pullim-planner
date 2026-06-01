import { HttpStatus, INestApplication, ValidationPipe } from "@nestjs/common";

/**
 * 글로벌 프리픽스 / ValidationPipe를 설정한다.
 * Filter, Interceptor, Guard는 AppModule의 providers에서 APP_* 토큰으로 등록한다.
 *
 * `errorHttpStatusCode: 422` — spec §3.2 결정 (`validation_failed` → 422 UNPROCESSABLE_ENTITY).
 * 기본값 400을 사용하면 `COMMON_VALIDATION_FAILED` envelope의 statusCode가 spec과
 * 어긋나 FE 에러 분기까지 깨진다.
 *
 * @param app - NestJS 애플리케이션 인스턴스
 */
export function setupGlobal(app: INestApplication): void {
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );
}
