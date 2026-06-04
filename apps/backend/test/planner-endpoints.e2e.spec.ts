import "reflect-metadata";
import type { AddressInfo } from "node:net";

import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";

import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { ResponseInterceptor } from "../src/common/interceptors/response.interceptor";
import { setupGlobal } from "../src/common/bootstrap/setup-global";
import { todayKstIsoDate } from "../src/common/utils/datetime.util";
import { BlocksController } from "../src/modules/planner/controller/blocks.controller";
import { MeController } from "../src/modules/planner/controller/me.controller";
import { PlannerController } from "../src/modules/planner/controller/planner.controller";
import { PlannerRepositoryInterface } from "../src/modules/planner/interface/planner-repository.interface";
import { PlannerService } from "../src/modules/planner/service/planner.service";
import { GetMeUseCase } from "../src/modules/planner/use-cases/get-me.use-case";
import { GetPlannerBlocksUseCase } from "../src/modules/planner/use-cases/get-planner-blocks.use-case";
import { GetPlannersUseCase } from "../src/modules/planner/use-cases/get-planners.use-case";

/**
 * Phase δ endpoint-level 통합 테스트 (DB 없이 mock 리포지토리).
 *
 * 실제 Nest 앱을 ephemeral 포트로 부팅해 controller→use-case→service→(mock)repo 배선,
 * 응답 envelope, ValidationPipe(422), 소유권 403/404, date 기본값(KST)을 회귀 고정한다.
 * (CI 는 Postgres·jest 미실행이라 DB-backed 통합은 로컬 수동검증으로 보완 — 본 스펙은 DB
 * 의존 없이 어디서나 도는 계약 테스트.)
 */
const STUDENT = "student_001";

interface JsonResult {
  success: boolean;
  data?: unknown;
  error?: { code: string; statusCode: number };
}

describe("planner read endpoints (Phase δ)", () => {
  let app: NestExpressApplication;
  let baseUrl: string;
  let lastBlocksDate: string | undefined;

  beforeAll(async () => {
    lastBlocksDate = undefined;

    const mockRepo: PlannerRepositoryInterface = {
      findUserById: (id) =>
        Promise.resolve(
          id === STUDENT
            ? ({
                id: STUDENT,
                name: "서연",
                grade: "고2",
                track: "이과",
                school: "풀림고등학교",
                focusSubjects: ["math"],
                weeklyHours: 28,
                preferredStudyTime: "저녁",
                joinedAt: new Date("2026-01-11T15:00:00.000Z"),
                streakDays: 17,
              } as never)
            : null,
        ),
      findPlannersByUser: () =>
        Promise.resolve([
          {
            id: "pl_001",
            userId: STUDENT,
            name: "6월 모의평가",
            examType: "mock",
            examLabel: "6월 모의평가",
            examStartDate: "2026-06-04",
            examEndDate: "2026-06-04",
            targetKind: "grade",
            targetValue: "1",
            weekdayStart: 18,
            weekdayEnd: 23,
            weekendStart: 10,
            weekendEnd: 22,
            blockPattern: "focused",
            weaknessAutoReflect: true,
            motivationStyle: "guided",
            motto: "사수",
            active: true,
            archived: false,
            customization: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ] as never),
      findPlannerById: (id) => {
        if (id === "pl_001")
          return Promise.resolve({ id, userId: STUDENT } as never);
        if (id === "pl_other")
          return Promise.resolve({ id, userId: "someone_else" } as never);
        return Promise.resolve(null);
      },
      findActivePlanner: () =>
        Promise.resolve({
          examStartDate: "2026-06-04",
          examLabel: "6월 모의평가",
        } as never),
      findSubjectUnits: () =>
        Promise.resolve([
          {
            plannerId: "pl_001",
            subject: "math",
            position: 0,
            unitLabel: "미적분",
          },
        ] as never),
      findBlocksByDate: (_plannerId, date) => {
        lastBlocksDate = date;
        return Promise.resolve([
          {
            id: "b1",
            plannerId: "pl_001",
            date,
            startTime: "17:30:00",
            endTime: "18:10:00",
            subject: "math",
            type: "concept",
            title: "미분",
            linkedFeatureSlug: null,
            curriculumNodeId: null,
            engines: ["pomodoro"],
            status: "done",
            progress: 1,
            expectedMinutes: 40,
            reasoning: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ] as never);
      },
      findCompletions: () => Promise.resolve([]),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [MeController, PlannerController, BlocksController],
      providers: [
        GetMeUseCase,
        GetPlannersUseCase,
        GetPlannerBlocksUseCase,
        PlannerService,
        { provide: PlannerRepositoryInterface, useValue: mockRepo },
        { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    setupGlobal(app);
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}/api`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/me — envelope + persona shape(examLabel 파생) + 미인증 demo 폴백", async () => {
    const res = await fetch(`${baseUrl}/me`);
    const body = (await res.json()) as JsonResult;
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data.id).toBe(STUDENT);
    expect(data.examLabel).toBe("6월 모의평가");
    expect(data.joinedAt).toBe("2026-01-12");
  });

  it("GET /api/planners — 목록 중첩 shape", async () => {
    const res = await fetch(`${baseUrl}/planners`);
    const body = (await res.json()) as JsonResult;
    expect(res.status).toBe(200);
    const list = body.data as Array<Record<string, unknown>>;
    expect(list).toHaveLength(1);
    expect(list[0].target).toEqual({ kind: "grade", value: 1 });
    expect(list[0].subjectUnits).toEqual({ math: ["미적분"] });
  });

  it("GET /api/planners/:id/blocks — date 미지정 시 KST 오늘로 조회", async () => {
    const res = await fetch(`${baseUrl}/planners/pl_001/blocks`);
    const body = (await res.json()) as JsonResult;
    expect(res.status).toBe(200);
    expect(lastBlocksDate).toBe(todayKstIsoDate());
    expect((body.data as unknown[]).length).toBe(1);
  });

  it("타인 플래너 → 403 COMMON_FORBIDDEN", async () => {
    const res = await fetch(
      `${baseUrl}/planners/pl_other/blocks?date=2026-06-04`,
    );
    const body = (await res.json()) as JsonResult;
    expect(res.status).toBe(403);
    expect(body.error?.code).toBe("COMMON_FORBIDDEN");
  });

  it("없는 플래너 → 404 PLANNER_NOT_FOUND", async () => {
    const res = await fetch(
      `${baseUrl}/planners/missing/blocks?date=2026-06-04`,
    );
    const body = (await res.json()) as JsonResult;
    expect(res.status).toBe(404);
    expect(body.error?.code).toBe("PLANNER_NOT_FOUND");
  });

  it("잘못된 date 형식 → 422 validation", async () => {
    const res = await fetch(`${baseUrl}/planners/pl_001/blocks?date=2026-6-4`);
    expect(res.status).toBe(422);
  });

  it("존재하지 않는 달력 날짜 → 422 validation", async () => {
    for (const bad of ["2026-13-01", "2026-02-31"]) {
      const res = await fetch(`${baseUrl}/planners/pl_001/blocks?date=${bad}`);
      expect(res.status).toBe(422);
    }
  });
});
