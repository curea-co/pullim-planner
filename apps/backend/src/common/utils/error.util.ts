import { HttpException } from "@nestjs/common";

/**
 * `unknown`으로 잡은 예외의 stack trace를 안전하게 추출한다.
 * @param error - try/catch로 잡은 unknown 예외
 * @returns Error 인스턴스이면 stack 문자열, 그 외 undefined
 */
export function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

/**
 * NestJS `HttpException` 응답 본문에서 `ErrorMessages.code`를 안전하게 추출한다.
 * @param error - 검사할 HttpException
 * @returns code 문자열, 추출 실패 시 undefined
 */
export function getHttpExceptionCode(error: HttpException): string | undefined {
  const response = error.getResponse();
  if (typeof response !== "object" || response === null) return undefined;
  const code = (response as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
