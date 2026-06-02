/**
 * Mock 인증 헤더 이름.
 * planner BE는 Mock 헤더 인증만 사용한다 (plan §1.3, §6.2).
 * - 헤더가 있으면 해당 user-id 사용
 * - 헤더가 없으면 fallback ({@link DEFAULT_MOCK_USER_ID})
 */
export const MOCK_USER_HEADER = "x-user-id";

/**
 * Mock 인증 fallback user id (= 데모 폴백 사용자).
 *
 * pullim-planner는 단일 학습자 데모 도메인이므로, 세션이 없을 때 기본 학생 계정으로 처리한다.
 * `getCurrentUserId(req)` resolver 가 세션 부재 시 이 id 로 폴백한다.
 * 도메인 모듈 + 인증 필수화(Phase 2/3) 진입 시 write 경로에서 이 폴백을 제거하고 401 로 전환한다.
 */
export const DEFAULT_MOCK_USER_ID = "student_001";

/**
 * 가입 시 도메인 `users` 행 프로비저닝용 플레이스홀더 (온보딩 전 임시값).
 *
 * 도메인 `users` 의 NOT NULL 컬럼(grade/track/weekly_hours/preferred_study_time)은
 * 가입 시점에 알 수 없으므로 온보딩 전까지 본 기본값으로 채운다. 온보딩 플로우가 실제 값으로
 * 갱신한다. (도메인 모듈이 아직 BE 에 없으므로 현재는 신원 행만 만들어 둔다.)
 */
export const ONBOARDING_PENDING_DEFAULTS = {
  grade: "미정",
  track: "미정",
  // `users.focus_subjects` 는 NOT NULL(text[]) — 온보딩 전엔 빈 배열로 채운다.
  focusSubjects: [] as readonly string[],
  weeklyHours: 0,
  preferredStudyTime: "미정",
} as const;
