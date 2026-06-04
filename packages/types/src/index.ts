// BE↔FE 공유 타입.
//
// 현재: auth 컨트롤러(`apps/backend/src/modules/auth`) 계약과 1:1 정렬된 인증 타입.
// 향후: Phase γ에서 planner entity 시그니처(Planner/TimeBlock 등)를 여기에 추가한다.

/** 사용자 역할 — BE `UserRole` enum 정렬 (planner 단일 도메인: user/admin 2종). */
export type UserRole = "user" | "admin";

/** 회원가입 요청 (`POST /auth/signup`). BE `SignupDto` 정렬. */
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  marketingConsent?: boolean;
}

/** 로그인 요청 (`POST /auth/login`). */
export interface LoginRequest {
  email: string;
  password: string;
}

/** access/refresh 토큰 쌍 — `login`·`refresh` 응답이자 `signup` 응답에 포함. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** 회원가입 응답 (`POST /auth/signup`) — 토큰 쌍 + 식별 정보. */
export interface SignupResult extends AuthTokens {
  id: string;
  email: string;
  role: UserRole;
}

/** 현재 인증 사용자 (`GET /auth/me`). 민감 필드는 BE `MeResponseDto`에서 제외됨. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
}

/** 이메일 중복 확인 응답 (`GET /auth/check-email`). */
export interface CheckEmailResult {
  available: boolean;
}

/**
 * BE 표준 성공 envelope (`ResponseInterceptor`).
 * void 핸들러(DELETE·logout 등)는 `data` 키를 생략한다.
 */
export type ApiEnvelope<T> = { success: true; data: T } | { success: true };

/** BE 표준 에러 envelope (`HttpExceptionFilter`). */
export interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string; statusCode: number };
}
