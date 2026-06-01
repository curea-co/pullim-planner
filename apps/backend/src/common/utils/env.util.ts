/**
 * env 문자열을 TCP 포트(정수)로 파싱한다.
 *
 * `parseInt` 만 사용하면 `DATABASE_PORT=abc` 같은 잘못된 값에서 `NaN` 이 그대로
 * 통과해, 앱/마이그레이션 CLI 가 부팅 단계에서 명확히 실패하지 않고 드라이버 내부
 * 에러로 터져 원인 파악이 어려워진다. 잘못된 값이면 **즉시 throw** 한다 (codex R8 지적).
 *
 * NestJS 등 무거운 의존성을 import 하지 않아 TypeORM CLI(`data-source.ts`) 와
 * 런타임 config 양쪽에서 안전하게 재사용할 수 있다.
 *
 * @param value - 파싱할 env 문자열 (`undefined` 이면 `fallback` 사용)
 * @param fallback - 값이 없을 때 사용할 기본 포트
 * @param envName - 에러 메시지에 표기할 env 변수명
 * @returns 1–65535 범위의 정수 포트
 */
export function parsePort(
  value: string | undefined,
  fallback: number,
  envName: string,
): number {
  if (value === undefined || value === "") return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(
      `Invalid ${envName} value: "${value}". ` +
        `Set ${envName} to a valid TCP port (1–65535) or unset it to use the default (${fallback}).`,
    );
  }
  return port;
}
