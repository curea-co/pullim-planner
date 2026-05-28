/**
 * Mock 인증 헤더 이름.
 * planner BE는 Mock 헤더 인증만 사용한다 (plan §1.3, §6.2).
 * - 헤더가 있으면 해당 user-id 사용
 * - 헤더가 없으면 fallback ({@link DEFAULT_MOCK_USER_ID})
 */
export const MOCK_USER_HEADER = "x-user-id";

/**
 * Mock 인증 fallback user id.
 * pullim-planner는 단일 학습자 도메인이므로 헤더 누락 시 기본 학생 계정으로 처리한다.
 * Phase η에서 실인증 도입 시 본 fallback을 제거하고 401 응답으로 전환한다.
 */
export const DEFAULT_MOCK_USER_ID = "student_001";
