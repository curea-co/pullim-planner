import "reflect-metadata";
import type { Server } from "node:net";
import type { AddressInfo } from "node:net";

import { NestExpressApplication } from "@nestjs/platform-express";
import { NestFactory } from "@nestjs/core";

import { setupGlobal } from "../src/common/bootstrap/setup-global";
import { setupSecurity } from "../src/common/bootstrap/setup-security";
import { setupSwagger } from "../src/common/bootstrap/setup-swagger";

interface SuccessEnvelope<T> {
  success: boolean;
  data: T;
}
interface ErrorEnvelope {
  success: boolean;
  error: { code: string; message: string; statusCode: number };
}
interface OpenApiDoc {
  openapi?: string;
  swagger?: string;
  paths?: Record<string, unknown>;
}

/** `fetch` 응답 본문을 지정 타입으로 안전하게 파싱한다 (lint no-unsafe-* 회피). */
async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

/**
 * Phase β common 인프라 wiring 통합 테스트.
 *
 * 이 PR 이 추가한 bootstrap/guard/filter/swagger/response-envelope 배선의 회귀를
 * 고정한다 (codex R12 지적). 새 의존성(supertest) 없이 실제 앱을 ephemeral 포트로
 * 부팅한 뒤 Node `fetch` 로 호출한다.
 *
 * 검증 범위:
 * - `DATABASE_ENABLED` off(기본): Postgres 없이도 부팅
 * - `/api/health`: Public 라우트 + ResponseInterceptor envelope `{ success, data }`
 * - `/api/whoami`: MockAuthGuard 의 `X-User-Id` 헤더 처리 + fallback
 * - `/api/_test-throw`: HttpExceptionFilter 의 error envelope `{ success:false, error }`
 * - `/api/_test-unknown-throw`: AllExceptionsFilter 의 500 envelope
 * - `/api-docs-json`: Swagger 노출 (development)
 */
describe("Phase β common 인프라 wiring (integration)", () => {
  let app: NestExpressApplication;
  let baseUrl: string;
  const prevDbEnabled = process.env.DATABASE_ENABLED;
  const prevNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    // DB 비활성 + development(Swagger/dev 라우트 활성) 환경으로 부팅.
    delete process.env.DATABASE_ENABLED;
    process.env.NODE_ENV = "development";

    // app.module 은 import 시점에 DATABASE_ENABLED 를 읽으므로, 위 env 설정 이후 동적 import.
    const { AppModule } = (await import("../src/app.module")) as {
      AppModule: unknown;
    };

    app = await NestFactory.create<NestExpressApplication>(AppModule as never, {
      logger: false,
    });
    setupSecurity(app);
    setupGlobal(app);
    setupSwagger(app);
    await app.listen(0);

    const server = app.getHttpServer() as Server;
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prevDbEnabled === undefined) delete process.env.DATABASE_ENABLED;
    else process.env.DATABASE_ENABLED = prevDbEnabled;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
  });

  it("DB 비활성으로도 부팅되고 /api/health 가 success envelope 을 반환한다", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await readJson<SuccessEnvelope<unknown>>(res);
    expect(body).toEqual({
      success: true,
      data: { status: "ok", service: "pullim-planner-backend" },
    });
  });

  it("/api/whoami 가 X-User-Id 헤더를 반영한다", async () => {
    const res = await fetch(`${baseUrl}/api/whoami`, {
      headers: { "X-User-Id": "tester-42" },
    });
    expect(res.status).toBe(200);
    const body = await readJson<SuccessEnvelope<{ userId: string }>>(res);
    expect(body).toEqual({ success: true, data: { userId: "tester-42" } });
  });

  it("/api/whoami 가 헤더 부재 시 fallback student_001 로 동작한다", async () => {
    const res = await fetch(`${baseUrl}/api/whoami`);
    expect(res.status).toBe(200);
    const body = await readJson<SuccessEnvelope<{ userId: string }>>(res);
    expect(body).toEqual({ success: true, data: { userId: "student_001" } });
  });

  it("/api/_test-throw 가 HttpExceptionFilter 의 error envelope 을 반환한다", async () => {
    const res = await fetch(`${baseUrl}/api/_test-throw`);
    expect(res.status).toBe(404);
    const body = await readJson<ErrorEnvelope>(res);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("PLANNER_NOT_FOUND");
    expect(body.error.statusCode).toBe(404);
  });

  it("/api/_test-unknown-throw 가 AllExceptionsFilter 의 500 envelope 을 반환한다", async () => {
    const res = await fetch(`${baseUrl}/api/_test-unknown-throw`);
    expect(res.status).toBe(500);
    const body = await readJson<ErrorEnvelope>(res);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("COMMON_UNKNOWN_ERROR");
    expect(body.error.statusCode).toBe(500);
  });

  it("development 에서 Swagger(/api-docs-json) 가 노출된다", async () => {
    const res = await fetch(`${baseUrl}/api-docs-json`);
    expect(res.status).toBe(200);
    const body = await readJson<OpenApiDoc>(res);
    expect(body.openapi ?? body.swagger).toBeDefined();
    expect(body.paths).toBeDefined();
  });
});
