import { ApiError } from './errors';

/** 서버의 안정 code만 판정한다. Origin 실패는 토큰 재취득으로 복구하지 않는다. */
export function isCsrfTokenMismatch(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 403 && error.code === 'CSRF_TOKEN_MISMATCH';
}

/** CSRF 검증 실패는 플래너 권한 부족이나 세션 만료의 증거가 아니다. */
export function isCsrfFailure(error: unknown): boolean {
  return isCsrfTokenMismatch(error) || (
    error instanceof ApiError && error.statusCode === 403 && error.code === 'CSRF_ORIGIN_REJECTED'
  );
}
