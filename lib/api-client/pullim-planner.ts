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
 * pullim-api 계약 타입은 여기 co-locate 한다(pullim-session 의 PullimMeProfile 동형).
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

/**
 * 목표 — kind 와 value 를 묶은 discriminated union 으로 잘못된 조합을 컴파일 타임에 차단한다.
 * grade/score → number, free → string (pullim-api `@IsValidTargetValue`).
 */
export type PullimPlannerTarget =
  | { kind: "grade" | "score"; value: number }
  | { kind: "free"; value: string };

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
 * 완료 메타(`completed` + accuracy/emotion/notes/completedAt)는 `block_completions` LEFT JOIN
 * 결과다(pullim-api #162). 완료 기록이 있을 때만 `completed:true` + 비-null 메타를 싣고, 없으면
 * `completed:false` + 메타 키 생략(null 날조 안 함)이라 optional 로 둔다.
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
  /** 완료 기록 존재 여부(`block_completions`). false 면 아래 완료 메타는 생략된다. */
  completed: boolean;
  /** 완료 + 값 있을 때만(0~100). */
  accuracy?: number;
  /** 완료 + 값 있을 때만(감정 점수). */
  emotion?: number;
  notes?: string;
  /** 완료 시각(ISO). */
  completedAt?: string;
}

// ── 루틴(반복 학습 블록 라이브러리) ──────────────────────────────────────────

/**
 * 루틴 (`RoutineResponseDto`) — 사용자 단위 반복 학습 블록 라이브러리 항목.
 * `weekdayMask`: 요일 비트마스크(bit0=월 … bit6=일, 1~127). FE 의 `weekdays[]`(0=월…6=일)와는
 * `weekdaysToMask`/`maskToWeekdays` 로 변환한다(경계 변환 — FE 는 배열, BE 는 마스크).
 */
export interface PullimRoutine {
  id: string;
  title: string;
  subject: string;
  type: string;
  /** HH:MM. */
  startTime: string;
  endTime: string;
  expectedMinutes: number;
  /** 요일 비트마스크(bit0=월 … bit6=일, 1~127). */
  weekdayMask: number;
  engines: string[];
  enabled: boolean;
  /** ISO. */
  createdAt: string;
  updatedAt: string;
}

/** 루틴 생성 입력 (`RoutineWriteDto`). `engines`/`enabled` 는 선택(BE 기본 `[]`/`true`). */
export interface PullimRoutineWrite {
  title: string;
  subject: string;
  type: string;
  startTime: string;
  endTime: string;
  expectedMinutes: number;
  weekdayMask: number;
  engines?: string[];
  enabled?: boolean;
}

/** 루틴 부분 수정 입력 (`RoutinePatchDto`) — 제공한 필드만 갱신한다. */
export type PullimRoutinePatch = Partial<PullimRoutineWrite>;

/**
 * 블록 완료 기록 입력 (`CompletionWriteDto`, pullim-api #416) — 전 필드 선택.
 * `completedAt` 은 서버 소유(본문 비포함 — 클라 전송 비권위). PK=blockId 1:1 이라 재제출은 upsert.
 */
export interface PullimCompletionWrite {
  /** 정답률(0~100, 선택). */
  accuracy?: number;
  /** 감정 지표(1~5 등 smallint, 선택). */
  emotion?: number;
  /** 완료 메모(선택). */
  notes?: string;
}

/**
 * 새 시간표 생성 시 적용할 루틴 (`RoutineApplicationDto`).
 * `endRange`: indefinite(상시) / exam(시험 종료까지) — 현재 BE 는 둘 다 시간표 범위(examEndDate)로 cap.
 */
export interface PullimRoutineApplication {
  routineId: string;
  endRange: "indefinite" | "exam";
}

/**
 * FE `weekdays[]`(0=월 … 6=일) → 요일 비트마스크(bit0=월 … bit6=일, 1~127).
 * 유효 범위(0~6 정수) 밖 값은 무시해 항상 7비트 마스크(0~127)만 만든다 — 잘못된 입력이 범위 밖
 * 마스크로 새지 않게(빈 배열이면 0 — BE `@Min(1)` 가 거부).
 */
export function weekdaysToMask(weekdays: number[]): number {
  return weekdays.reduce(
    (mask, d) =>
      Number.isInteger(d) && d >= 0 && d <= 6 ? mask | (1 << d) : mask,
    0,
  );
}

/** 요일 비트마스크 → `weekdays[]`(0=월 … 6=일, 오름차순). */
export function maskToWeekdays(mask: number): number[] {
  const days: number[] = [];
  for (let d = 0; d < 7; d++) if ((mask >> d) & 1) days.push(d);
  return days;
}

/**
 * 시간표 **생성** 입력 — 편집 필드(`PullimPlannerWrite`) + 생성 시 bake 할 루틴 목록(선택).
 * `routineApplications` 는 **생성 전용**이라 수정(`update`)에는 두지 않는다(수정은 `PullimPlannerWrite`).
 */
export interface PullimPlannerCreate extends PullimPlannerWrite {
  routineApplications?: PullimRoutineApplication[];
}

/**
 * 루틴(사용자 단위 라이브러리) 클라이언트 — planner 클라와 같은 cookie-http/CSRF 위에 동작한다.
 * `createPullimPlannerClient` 가 planner 메서드와 함께 반환한다(같은 base·CSRF 공유). planner 자원과
 * 분리된 인터페이스라 `PullimPlannerClient` 소비자(예: FE 어댑터)는 영향받지 않는다.
 */
export interface PullimRoutineClient {
  /** 내 루틴 목록(최신순). `GET /planner/routines`. */
  routines(): Promise<PullimRoutine[]>;
  /** 루틴 생성. `POST /planner/routines`. */
  createRoutine(input: PullimRoutineWrite): Promise<PullimRoutine>;
  /** 루틴 부분 수정(제공 필드만). `PATCH /planner/routines/:routineId`. */
  updateRoutine(
    routineId: string,
    patch: PullimRoutinePatch,
  ): Promise<PullimRoutine>;
  /** 루틴 삭제. `DELETE /planner/routines/:routineId`. */
  deleteRoutine(routineId: string): Promise<void>;
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
  /** 생성(비활성). `POST /planner/planners`. 생성 전용 입력(루틴 적용 포함). */
  create(input: PullimPlannerCreate): Promise<PullimPlanner>;
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
 * 블록 완료 기록 write 클라이언트(pullim-api #416) — `PullimPlannerClient`와 **분리된 인터페이스**.
 * 기존 소비자(어그리게이트 싱글톤 등)의 구현 의무를 늘리지 않아 패키지 변경이 앱 컴파일을 깨지
 * 않는다 — 소비 측 채택은 후속 FE PR에서 `& PullimBlockCompletionClient`로 opt-in.
 */
export interface PullimBlockCompletionClient {
  /**
   * 완료 기록 upsert. `POST /planner/planners/:id/blocks/:blockId/completion` (201).
   * 응답 = 완료 메타 포함 블록. 재제출은 수정(upsert). 타인 소유 403 · 플래너/블록 미존재 404.
   */
  completeBlock(
    plannerId: string,
    blockId: string,
    input?: PullimCompletionWrite,
  ): Promise<PullimBlock>;
  /** 완료 취소(멱등 — 기록 없어도 204). `DELETE /planner/planners/:id/blocks/:blockId/completion`. */
  uncompleteBlock(plannerId: string, blockId: string): Promise<void>;
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
): PullimPlannerClient &
  PullimBlockCompletionClient &
  PullimRoutineClient {
  // CSRF double-submit 토큰 관리 — 메모리 캐시 + single-flight(pullim-session ensureCsrf 동형).
  // 토큰을 부트스트랩해 **명시 동봉**하므로 SSR/test(브라우저 `document.cookie` 부재)에서도 동작하고,
  // 매 mutation 마다 일부러 403 을 한 번 맞고 재시도하는 구조를 피한다. cookie 자동회수에 의존하지 않음.
  // single-flight 라 병렬 mutation 이 부트스트랩을 공유해 토큰 회전 race 도 막는다.
  let csrfToken: string | null = null;
  let csrfInFlight: Promise<string> | null = null;
  async function ensureCsrf(): Promise<string> {
    if (csrfToken) return csrfToken;
    if (!csrfInFlight) {
      csrfInFlight = bootstrapCsrf(config)
        .then((token) => {
          csrfToken = token;
          return token;
        })
        .finally(() => {
          csrfInFlight = null;
        });
    }
    return csrfInFlight;
  }

  /** 상태변경 요청. CSRF 토큰 동봉 → 회전·만료로 1회 거부되면 캐시 무효화 후 재부트스트랩·1회 재시도. */
  async function mutate<T>(
    path: string,
    method: "POST" | "PUT" | "PATCH" | "DELETE",
    body?: unknown,
  ): Promise<T> {
    const token = await ensureCsrf();
    try {
      return await cookieRequest<T>(config, path, {
        method,
        body,
        csrfToken: token,
      });
    } catch (error) {
      if (!isCsrfRejection(error)) throw error;
      csrfToken = null;
      const fresh = await ensureCsrf();
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

    completeBlock(plannerId, blockId, input) {
      return mutate<PullimBlock>(
        `/planner/planners/${plannerId}/blocks/${blockId}/completion`,
        "POST",
        input ?? {},
      );
    },

    uncompleteBlock(plannerId, blockId) {
      return mutate<void>(
        `/planner/planners/${plannerId}/blocks/${blockId}/completion`,
        "DELETE",
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

    routines() {
      return cookieRequest<PullimRoutine[]>(config, "/planner/routines");
    },

    createRoutine(input) {
      return mutate<PullimRoutine>("/planner/routines", "POST", input);
    },

    updateRoutine(routineId, patch) {
      return mutate<PullimRoutine>(
        `/planner/routines/${routineId}`,
        "PATCH",
        patch,
      );
    },

    deleteRoutine(routineId) {
      return mutate<void>(`/planner/routines/${routineId}`, "DELETE");
    },

  };
}
