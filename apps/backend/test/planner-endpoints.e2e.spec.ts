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
import { PlannerMutationController } from "../src/modules/planner/controller/planner-mutation.controller";
import { PlannerRepositoryInterface } from "../src/modules/planner/interface/planner-repository.interface";
import { PlannerService } from "../src/modules/planner/service/planner.service";
import { ActivatePlannerUseCase } from "../src/modules/planner/use-cases/activate-planner.use-case";
import { ArchivePlannerUseCase } from "../src/modules/planner/use-cases/archive-planner.use-case";
import { CreatePlannerUseCase } from "../src/modules/planner/use-cases/create-planner.use-case";
import { DeletePlannerUseCase } from "../src/modules/planner/use-cases/delete-planner.use-case";
import { DuplicatePlannerUseCase } from "../src/modules/planner/use-cases/duplicate-planner.use-case";
import { GetMeUseCase } from "../src/modules/planner/use-cases/get-me.use-case";
import { GetPlannerBlocksUseCase } from "../src/modules/planner/use-cases/get-planner-blocks.use-case";
import { GetPlannersUseCase } from "../src/modules/planner/use-cases/get-planners.use-case";
import { UpdateCustomizationUseCase } from "../src/modules/planner/use-cases/update-customization.use-case";
import { UpdatePlannerUseCase } from "../src/modules/planner/use-cases/update-planner.use-case";

/**
 * Phase δ read + Phase ε mutation 의 endpoint-level 통합 테스트 (DB 없이 stateful mock 리포).
 *
 * 실제 Nest 앱을 ephemeral 포트로 부팅해 controller→use-case→service→(mock)repo 배선,
 * 응답 envelope, ValidationPipe(422), 소유권 403/404, 활성 불변식(409), date 기본값(KST)을
 * 회귀 고정한다. mock 리포는 내부 Map 상태를 가져 create/update/delete/activate/archive/
 * duplicate/customization 의 실제 효과를 검증한다 (각 it 전 seed 로 리셋).
 * (CI 는 Postgres·jest 미실행 — DB-backed 통합은 로컬 수동검증으로 보완.)
 */
const STUDENT = "student_001";

interface JsonResult {
  success: boolean;
  data?: unknown;
  error?: { code: string; statusCode: number };
}

interface PlannerRow {
  id: string;
  userId: string;
  name: string;
  examType: string;
  examLabel: string;
  examStartDate: string;
  examEndDate: string;
  targetKind: string;
  targetValue: string;
  weekdayStart: number;
  weekdayEnd: number;
  weekendStart: number;
  weekendEnd: number;
  blockPattern: string;
  weaknessAutoReflect: boolean;
  motivationStyle: string;
  motto: string | null;
  active: boolean;
  archived: boolean;
  customization: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UnitRow {
  plannerId: string;
  subject: string;
  position: number;
  unitLabel: string;
}

/** pl_001 — STUDENT 의 활성 플래너 (read 테스트 기준 시드). */
function seedPlanner001(): PlannerRow {
  return {
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
  };
}

/** 유효한 생성/수정 요청 본문 (중첩 shape). */
function validWriteBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "9월 모의평가",
    examType: "mock",
    examLabel: "9월 모의평가",
    examStartDate: "2026-09-03",
    examEndDate: "2026-09-03",
    target: { kind: "grade", value: 2 },
    weekdayHours: { start: 18, end: 22 },
    weekendHours: { start: 10, end: 20 },
    subjectUnits: { math: ["수열", "극한"], english: ["독해"] },
    blockPattern: "focused",
    weaknessAutoReflect: true,
    motivationStyle: "guided",
    motto: "",
    ...overrides,
  };
}

describe("planner endpoints (Phase δ read + Phase ε mutation)", () => {
  let app: NestExpressApplication;
  let baseUrl: string;
  let lastBlocksDate: string | undefined;

  // stateful mock 저장소 — beforeEach 에서 시드로 리셋한다.
  const planners = new Map<string, PlannerRow>();
  const units = new Map<string, UnitRow[]>();

  function resetStore(): void {
    planners.clear();
    units.clear();
    planners.set("pl_001", seedPlanner001());
    units.set("pl_001", [
      {
        plannerId: "pl_001",
        subject: "math",
        position: 0,
        unitLabel: "미적분",
      },
    ]);
    // 타인 소유 플래너 (403 검증용).
    planners.set("pl_other", {
      ...seedPlanner001(),
      id: "pl_other",
      userId: "someone_else",
      active: false,
    });
  }

  beforeEach(() => {
    resetStore();
    lastBlocksDate = undefined;
  });

  beforeAll(async () => {
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
      findPlannersByUser: (userId) =>
        Promise.resolve(
          [...planners.values()]
            .filter((p) => p.userId === userId)
            .sort((a, b) => Number(b.active) - Number(a.active)) as never,
        ),
      findPlannerById: (id) =>
        Promise.resolve((planners.get(id) ?? null) as never),
      findActivePlanner: (userId) =>
        Promise.resolve(
          ([...planners.values()].find(
            (p) => p.userId === userId && p.active && !p.archived,
          ) ?? null) as never,
        ),
      findSubjectUnits: (ids) =>
        Promise.resolve(ids.flatMap((id) => units.get(id) ?? []) as never),
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

      // ── write ──────────────────────────────────────────────────────────
      insertPlanner: (planner, unitRows) => {
        planners.set(planner.id, { ...planner });
        units.set(planner.id, unitRows);
        return Promise.resolve();
      },
      replacePlanner: (planner, unitRows) => {
        const existing = planners.get(planner.id)!;
        const next = planner;
        planners.set(planner.id, {
          ...next,
          // 보존 필드 (실 repo 정합) — customization 은 전용 엔드포인트 소유라 update 시 보존.
          active: existing.active,
          archived: existing.archived,
          createdAt: existing.createdAt,
          customization: existing.customization,
        });
        units.set(planner.id, unitRows);
        return Promise.resolve();
      },
      deletePlanner: (id) => {
        planners.delete(id);
        units.delete(id);
        return Promise.resolve();
      },
      setActivePlanner: (userId, id) => {
        for (const p of planners.values()) {
          if (p.userId === userId) p.active = false;
        }
        planners.get(id)!.active = true;
        return Promise.resolve();
      },
      setArchived: (id, archived) => {
        planners.get(id)!.archived = archived;
        return Promise.resolve();
      },
      updateCustomization: (id, customization) => {
        planners.get(id)!.customization = customization;
        return Promise.resolve();
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [
        MeController,
        PlannerController,
        BlocksController,
        PlannerMutationController,
      ],
      providers: [
        GetMeUseCase,
        GetPlannersUseCase,
        GetPlannerBlocksUseCase,
        CreatePlannerUseCase,
        UpdatePlannerUseCase,
        DeletePlannerUseCase,
        ActivatePlannerUseCase,
        ArchivePlannerUseCase,
        DuplicatePlannerUseCase,
        UpdateCustomizationUseCase,
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

  // ── read (Phase δ) ───────────────────────────────────────────────────────

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

  // ── mutation (Phase ε) ─────────────────────────────────────────────────

  it("POST /api/planners — 생성 201 + 중첩 shape + 신규는 inactive", async () => {
    const res = await fetch(`${baseUrl}/planners`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validWriteBody()),
    });
    const body = (await res.json()) as JsonResult;
    expect(res.status).toBe(201);
    const data = body.data as Record<string, unknown>;
    expect(typeof data.id).toBe("string");
    expect(data.active).toBe(false);
    expect(data.target).toEqual({ kind: "grade", value: 2 });
    expect(data.subjectUnits).toEqual({
      math: ["수열", "극한"],
      english: ["독해"],
    });
    // 실제로 저장됐는지 — 목록에 2건(pl_001 + 신규).
    expect(
      [...planners.values()].filter((p) => p.userId === STUDENT),
    ).toHaveLength(2);
  });

  it("POST /api/planners — name 누락 시 422", async () => {
    const res = await fetch(`${baseUrl}/planners`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validWriteBody({ name: "" })),
    });
    expect(res.status).toBe(422);
  });

  it("POST /api/planners — 필수 중첩 객체(target 등) 누락 시 500 아닌 422", async () => {
    // @IsDefined() 회귀 — 중첩 필수 객체를 통째로 빼면 service 500 이 아니라 422 로 막혀야 한다 (codex).
    for (const missing of ["target", "weekdayHours", "weekendHours"]) {
      const body = validWriteBody();
      delete (body as Record<string, unknown>)[missing];
      const res = await fetch(`${baseUrl}/planners`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(422);
    }
  });

  it("PUT /api/planners/:id/customization — customization 누락 시 422", async () => {
    const res = await fetch(`${baseUrl}/planners/pl_001/customization`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("POST /api/planners — cross-field 역전(시험범위·시간대) 422", async () => {
    const cases = [
      { examStartDate: "2026-09-10", examEndDate: "2026-09-03" }, // 종료 < 시작
      { weekdayHours: { start: 22, end: 18 } }, // start >= end
      { weekendHours: { start: 20, end: 20 } }, // 0 길이
    ];
    for (const bad of cases) {
      const res = await fetch(`${baseUrl}/planners`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validWriteBody(bad)),
      });
      expect(res.status).toBe(422);
    }
  });

  it("POST /api/planners — enum 위반(examType 등) 422", async () => {
    for (const bad of [
      { examType: "INVALID" },
      { blockPattern: "INVALID" },
      { motivationStyle: "INVALID" },
      { target: { kind: "INVALID", value: 1 } },
    ]) {
      const res = await fetch(`${baseUrl}/planners`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validWriteBody(bad)),
      });
      expect(res.status).toBe(422);
    }
  });

  it("POST /api/planners — target.value 가 kind 와 불일치 시 422", async () => {
    for (const bad of [
      { target: { kind: "grade", value: "A+" } }, // grade 인데 문자열
      { target: { kind: "free", value: 3 } }, // free 인데 숫자
    ]) {
      const res = await fetch(`${baseUrl}/planners`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validWriteBody(bad)),
      });
      expect(res.status).toBe(422);
    }
  });

  it("POST /api/planners — customization 잘못된 id 422", async () => {
    const res = await fetch(`${baseUrl}/planners`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        validWriteBody({
          customization: { layoutId: "block_cards", paletteId: "INVALID" },
        }),
      ),
    });
    expect(res.status).toBe(422);
  });

  it("PUT /api/planners/:id/customization — 잘못된 paletteId 422", async () => {
    const res = await fetch(`${baseUrl}/planners/pl_001/customization`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customization: { layoutId: "block_cards", paletteId: "NOPE" },
      }),
    });
    expect(res.status).toBe(422);
  });

  it("PUT /api/planners/:id — customization 미포함 수정은 기존 꾸미기 보존", async () => {
    // pl_001 에 customization 설정 후, customization 없는 PUT 수정 → 보존돼야 한다 (codex).
    planners.get("pl_001")!.customization = {
      layoutId: "block_cards",
      paletteId: "forest",
    };
    const res = await fetch(`${baseUrl}/planners/pl_001`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validWriteBody({ name: "수정됨" })),
    });
    const body = (await res.json()) as JsonResult;
    expect(res.status).toBe(200);
    expect((body.data as Record<string, unknown>).customization).toEqual({
      layoutId: "block_cards",
      paletteId: "forest",
    });
  });

  it("PUT /api/planners/:id — 수정 200 + 필드 반영", async () => {
    const res = await fetch(`${baseUrl}/planners/pl_001`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validWriteBody({ name: "이름변경" })),
    });
    const body = (await res.json()) as JsonResult;
    expect(res.status).toBe(200);
    expect((body.data as Record<string, unknown>).name).toBe("이름변경");
    expect(planners.get("pl_001")!.name).toBe("이름변경");
    // active 는 보존.
    expect(planners.get("pl_001")!.active).toBe(true);
  });

  it("DELETE /api/planners/:id — 활성 플래너는 409", async () => {
    const res = await fetch(`${baseUrl}/planners/pl_001`, { method: "DELETE" });
    const body = (await res.json()) as JsonResult;
    expect(res.status).toBe(409);
    expect(body.error?.code).toBe("PLANNER_ACTIVE_DELETE_FORBIDDEN");
  });

  it("DELETE /api/planners/:id — 비활성 생성 후 삭제 204", async () => {
    const created = (await (
      await fetch(`${baseUrl}/planners`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validWriteBody()),
      })
    ).json()) as JsonResult;
    const id = (created.data as Record<string, string>).id;
    const res = await fetch(`${baseUrl}/planners/${id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
    expect(planners.has(id)).toBe(false);
  });

  it("DELETE /api/planners/:id — 타인 소유 403", async () => {
    const res = await fetch(`${baseUrl}/planners/pl_other`, {
      method: "DELETE",
    });
    expect(res.status).toBe(403);
  });

  it("POST /api/planners/:id/activate — 전환 시 기존 active 해제", async () => {
    const created = (await (
      await fetch(`${baseUrl}/planners`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validWriteBody()),
      })
    ).json()) as JsonResult;
    const id = (created.data as Record<string, string>).id;
    const res = await fetch(`${baseUrl}/planners/${id}/activate`, {
      method: "POST",
    });
    const body = (await res.json()) as JsonResult;
    expect(res.status).toBe(200);
    expect((body.data as Record<string, unknown>).active).toBe(true);
    expect(planners.get("pl_001")!.active).toBe(false);
  });

  it("POST /api/planners/:id/archive — 활성 플래너는 409", async () => {
    const res = await fetch(`${baseUrl}/planners/pl_001/archive`, {
      method: "POST",
    });
    const body = (await res.json()) as JsonResult;
    expect(res.status).toBe(409);
    expect(body.error?.code).toBe("PLANNER_ACTIVE_CONFLICT");
  });

  it("POST /api/planners/:id/duplicate — 복제 201 + (복사) 접미 + inactive", async () => {
    const res = await fetch(`${baseUrl}/planners/pl_001/duplicate`, {
      method: "POST",
    });
    const body = (await res.json()) as JsonResult;
    expect(res.status).toBe(201);
    const data = body.data as Record<string, unknown>;
    expect(data.name).toBe("6월 모의평가 (복사)");
    expect(data.active).toBe(false);
    expect(data.subjectUnits).toEqual({ math: ["미적분"] });
  });

  it("PUT /api/planners/:id/customization — 꾸미기 저장 200", async () => {
    const res = await fetch(`${baseUrl}/planners/pl_001/customization`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customization: {
          layoutId: "block_cards",
          weekLayoutId: "school_grid",
          paletteId: "forest",
        },
      }),
    });
    const body = (await res.json()) as JsonResult;
    expect(res.status).toBe(200);
    expect((body.data as Record<string, unknown>).customization).toEqual({
      layoutId: "block_cards",
      weekLayoutId: "school_grid",
      paletteId: "forest",
    });
  });

  it("mutation 대상이 없으면 404", async () => {
    const res = await fetch(`${baseUrl}/planners/missing/activate`, {
      method: "POST",
    });
    const body = (await res.json()) as JsonResult;
    expect(res.status).toBe(404);
    expect(body.error?.code).toBe("PLANNER_NOT_FOUND");
  });
});
