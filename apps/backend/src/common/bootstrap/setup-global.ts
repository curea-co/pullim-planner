import { INestApplication, ValidationPipe } from "@nestjs/common";

/**
 * 글로벌 프리픽스 / ValidationPipe를 설정한다.
 * Filter, Interceptor, Guard는 AppModule의 providers에서 APP_* 토큰으로 등록한다.
 * @param app - NestJS 애플리케이션 인스턴스
 */
export function setupGlobal(app: INestApplication): void {
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
}
