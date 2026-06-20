import { bootstrapCsrf, cookieRequest, type CookieHttpConfig } from "./cookie-http";
import { ApiError } from "./errors";

/**
 * pullim-api(흡수형 planner 서비스) 도메인 데이터 클라이언트 — cookie-http 위 래퍼. 흡수 전환 §10.
 *
 * 자체 BE planner 클라이언트(`./planner.ts`, Bearer + `{success,data}` 엔벨로프 + 글로벌 prefix
 * `/api`)와 **계약이 다르다**:
 * - **base**: pullim-api 는 prefix 없음(`/planner/*`). 회원 인증은 HttpOnly 쿠키(브라우저 자동 첨부).
 * - **응답**: DTO 본문을 그대로 반환(엔벨로프 언랩 없음 — cookie-http 가 raw 파싱).
 * - **수정/꾸미기**: **PATCH** (자체 BE 는 PUT — pullim-api 는 PUT 미사용, PATCH 가 표준).
 * - **CSRF**: 상태변경은 double-submit. cookie-http 가 `csrfCookieName` 으로 CSRF 쿠키를 자동 동봉하고,
 *   토큰 회전으로 1회 거부되면 `/auth/csrf` 재부트스트랩 후 1회 재시도한다.
 *
 * 계약 타입은 pullim-api DTO 의 FE 소비 뷰다(`PlannerResponseDto`·`PlannerWriteDto`·`BlockResponseDto`).
 * 자체 BE 계약(@pullim-planner/types)과 출처가 달라 여기 co-locate 한다(pullim-session 의 PullimMeProfile 동형).
 *
 * 권위: pullim-api `src/planner/modules/<feature>/controller/` (controller + dto).
 */

// 서버 계약 enum(권위: pullim-api PlannerWriteDto `@IsIn(...)` + customization-options.constant).
// 입력은 이 union 으로 좁혀 잘못된 값을 컴파일 타임에 막는다. 응답도 동일 도메인이라 공유한다.
export type PullimExamType =
  | "mock"
  | "suneung"
  | "midterm"
  | "final"
  | "other";
export type PullimBlockPattern = "pomodoro" | "focused" | "deep";
export type PullimMotivationStyle = "autonomous" | "guided" | "spartan";
export type PullimLayoutId =
  | "vertical_timeline"
  | "checklist"
  | "block_cards"
  | "pie_list";
export type PullimWeekLayoutId =
  | "matrix_by_type"
  | "school_grid"
  | "bar_week"
  | "heatmap";
export type PullimPaletteId =
  | "pullim_blue"
  | "forest"
  | "sunset"
  | "pastel"
  | "mono"
  | "mint"
  | "rose";

/** 목표 — value 는 grade/score 면 number, free 면 string. */
export interface PullimPlannerTarget {
  kind: "grade" | "score" | "free";
  value: number | string;
}

/** 학습 시간대 — 0~24 시(時). */
export interface PullimPlannerHours {
  start: number;
  end: number;
}

/** 꾸미기 `{ layoutId, weekLayoutId?, paletteId }`. */
export interface PullimPlannerCustomization {
  layoutId: PullimLayoutId;
  weekLayoutId?: PullimWeekLayoutId;
  paletteId: PullimPaletteId;
}

/** 플래너 (`PlannerResponseDto`). */
export interface PullimPlanner {
  id: string;
  name: string;
  examType: PullimExamType;
  examLabel: string;
  /** YYYY-MM-DD. */
  examStartDate: string;
  examEndDate: string;
  target: PullimPlannerTarget;
  weekdayHours: PullimPlannerHours;
  weekendHours: PullimPlannerHours;
  /** 과목별 단원 라벨 맵. */
  subjectUnits: Record<string, string[]>;
  blockPattern: PullimBlockPattern;
  weaknessAutoReflect: boolean;
  motivationStyle: PullimMotivationStyle;
  /** 빈 문자열 가능. */
  motto: string;
  active: boolean;
  archived: boolean;
  /** 꾸미기(jsonb) — 미설정이면 null. 설정 시 `updateCustomization` 이 저장한 형태. */
  customization: PullimPlannerCustomization | null;
  /** ISO. */
  createdAt: string;
  updatedAt: string;
}

/** 생성/수정 입력 (`PlannerWriteDto`). */
export interface PullimPlannerWrite {
  name: string;
  examType: PullimExamType;
  examLabel: string;
  examStartDate: string;
  examEndDate: string;
  target: PullimPlannerTarget;
  weekdayHours: PullimPlannerHours;
  weekendHours: PullimPlannerHours;
  subjectUnits: Record<string, string[]>;
  blockPattern: PullimBlockPattern;
  weaknessAutoReflect: boolean;
  motivationStyle: PullimMotivationStyle;
  motto: string;
}

/**
 * 시간표 블록 (`BlockResponseDto`).
 *
 * ⚠️ **완료 메타(`accuracy`/`emotion`) 미포함** — pullim-api `BlockResponseDto` 는 TimeBlock 필드만
 * 매핑하고 `block_completions`(accuracy/emotion/notes)를 내려주지 않는다. 자체 BE 블록 UI(카드·리포트)가
 * 쓰던 정확도·감정 지표는 현 pullim-api 계약엔 없다(BE 갭 — pullim-api blocks 응답에 완료 메타 추가 필요,
 * 별도 핸드오프). 이 타입은 **실 응답에 충실히** 두어 없는 필드를 거짓으로 노출하지 않는다.
 */
export interface PullimBlock {
  id: string;
  /** HH:MM. */
  start: string;
  end: string;
  subject: string;
  type: string;
  title: string;
  engines: string[];
  /** 0~1. */
  progress: number;
  status: string;
  expectedMinutes: number;
  // raw passthrough — BE(`BlockResponseDto.from`)는 현재 null 이면 생략(undefined)하지만,
  // 클라이언트가 BE 의 omit-vs-null 직렬화 동작을 가정하지 않도록 `string | null` 로 넓혀
  // downstream 이 null·undefined 둘 다 처리하게 한다(원본 DTO nullable 컬럼 정합).
  linkedFeatureSlug?: string | null;
  curriculumNodeId?: string | null;
  reasoning?: string | null;
}

export type PullimPlannerClientConfig = CookieHttpConfig;

export interface PullimPlannerClient {
  /** 내 플래너 목록(active/inactive/archived). `GET /planner/planners`. */
  list(): Promise<PullimPlanner[]>;
  /**
   * 날짜별 시간표 블록. `GET /planner/planners/:id/blocks?date=YYYY-MM-DD`.
   * `date` 는 **선택** — 생략 시 BE 가 KST 오늘로 기본 처리한다
   * (`BlocksQueryDto @IsOptional` + 핸들러 `query.date ?? todayKstIsoDate()`).
   */
  blocks(plannerId: string, date?: string): Promise<PullimBlock[]>;
  /** 생성(비활성). `POST /planner/planners`. */
  create(input: PullimPlannerWrite): Promise<PullimPlanner>;
  /** 수정(편집 필드 교체). `PATCH /planner/planners/:id`. */
  update(id: string, input: PullimPlannerWrite): Promise<PullimPlanner>;
  /** 삭제(활성이면 409). `DELETE /planner/planners/:id`. */
  remove(id: string): Promise<void>;
  /** 활성 전환(타 플래너 비활성). `POST /planner/planners/:id/activate`. */
  activate(id: string): Promise<PullimPlanner>;
  /** 보관(활성이면 409). `POST /planner/planners/:id/archive`. */
  archive(id: string): Promise<PullimPlanner>;
  /** 보관 해제. `POST /planner/planners/:id/unarchive`. */
  unarchive(id: string): Promise<PullimPlanner>;
  /** 복제(비활성). `POST /planner/planners/:id/duplicate`. */
  duplicate(id: string): Promise<PullimPlanner>;
  /** 레이아웃/팔레트 저장. `PATCH /planner/planners/:id/customization`. */
  updateCustomization(
    id: string,
    customization: PullimPlannerCustomization,
  ): Promise<PullimPlanner>;
}

/**
 * CSRF 거부(토큰 회전·만료) 판정 — 403 **전체가 아니라 CSRF 마커**로 좁힌다(pullim-session 과 동일).
 * pullim-api 의 CSRF 거부는 메시지가 `CSRF:` 로 시작한다. 인가/잠금 등 비-CSRF 403 을 회전으로
 * 오인해 mutation 을 중복 발사하지 않도록 한정한다.
 */
function isCsrfRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.statusCode === 403 &&
    /^csrf/i.test(error.message)
  );
}

/**
 * pullim-api planner 데이터 클라이언트 팩토리. 메서드는 `this` 에 의존하지 않아 구조분해 안전.
 *
 * `config.csrfCookieName` 지정 시 상태변경 요청에서 cookie-http 가 CSRF 쿠키를 자동 동봉한다.
 * CSRF 부트스트랩(`/auth/csrf`)은 로그인/세션 복원 흐름(`PullimSessionClient`)이 담당한다.
 */
export function createPullimPlannerClient(
  config: PullimPlannerClientConfig,
): PullimPlannerClient {
  // 진행 중인 CSRF 재부트스트랩 공유(single-flight) — 병렬 mutation 이 동시에 CSRF 거부를 만나
  // 각자 `GET /auth/csrf` 를 쏘면 토큰을 서로 덮어써 일부가 계속 403 으로 실패한다(회전 race).
  // 하나의 재부트스트랩 결과를 공유해 막는다(pullim-session ensureCsrf 와 동형).
  let csrfRefreshInFlight: Promise<string> | null = null;
  function refreshCsrf(): Promise<string> {
    if (!csrfRefreshInFlight) {
      csrfRefreshInFlight = bootstrapCsrf(config).finally(() => {
        csrfRefreshInFlight = null;
      });
    }
    return csrfRefreshInFlight;
  }

  /** 상태변경 요청. CSRF 쿠키 자동 동봉 → 토큰 회전 1회 거부 시 재부트스트랩(single-flight) 후 1회 재시도. */
  async function mutate<T>(
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: unknown,
  ): Promise<T> {
    try {
      return await cookieRequest<T>(config, path, { method, body });
    } catch (error) {
      if (!isCsrfRejection(error)) throw error;
      // 쿠키 토큰이 회전·만료됐을 수 있으므로 single-flight 로 새로 받고 1회 재시도.
      const fresh = await refreshCsrf();
      return await cookieRequest<T>(config, path, {
        method,
        body,
        csrfToken: fresh,
      });
    }
  }

  return {
    list() {
      return cookieRequest<PullimPlanner[]>(config, "/planner/planners");
    },

    blocks(plannerId, date) {
      return cookieRequest<PullimBlock[]>(
        config,
        `/planner/planners/${plannerId}/blocks`,
        date ? { query: { date } } : undefined,
      );
    },

    create(input) {
      return mutate<PullimPlanner>("/planner/planners", "POST", input);
    },

    update(id, input) {
      return mutate<PullimPlanner>(`/planner/planners/${id}`, "PATCH", input);
    },

    remove(id) {
      return mutate<void>(`/planner/planners/${id}`, "DELETE");
    },

    activate(id) {
      return mutate<PullimPlanner>(`/planner/planners/${id}/activate`, "POST");
    },

    archive(id) {
      return mutate<PullimPlanner>(`/planner/planners/${id}/archive`, "POST");
    },

    unarchive(id) {
      return mutate<PullimPlanner>(`/planner/planners/${id}/unarchive`, "POST");
    },

    duplicate(id) {
      return mutate<PullimPlanner>(`/planner/planners/${id}/duplicate`, "POST");
    },

    updateCustomization(id, customization) {
      // pullim-api CustomizationDto 는 `{ customization: {...} }` 로 감싼다.
      return mutate<PullimPlanner>(
        `/planner/planners/${id}/customization`,
        "PATCH",
        { customization },
      );
    },
  };
}
