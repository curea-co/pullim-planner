const SENSITIVE_KEYS = new Set([
  "password",
  "newPassword",
  "currentPassword",
  "ssn",
  "residentNumber",
  "jumin",
  "paymentKey",
]);

const MASKED_VALUE = "***";

const TOKEN_PREFIX_LENGTH = 4;
const TOKEN_SUFFIX_LENGTH = 4;
const TOKEN_MIN_UNMASKED_LENGTH = TOKEN_PREFIX_LENGTH + TOKEN_SUFFIX_LENGTH + 1;

/**
 * 결제 키·토큰 등 식별자를 부분 마스킹한 문자열을 반환한다.
 * @param token - 마스킹 대상 식별자
 * @returns `{prefix}***{suffix}` 형식 (충분히 길지 않으면 전체 `***`)
 */
export function maskToken(token: string | null | undefined): string {
  if (!token) return MASKED_VALUE;
  if (token.length < TOKEN_MIN_UNMASKED_LENGTH) return MASKED_VALUE;
  return `${token.slice(0, TOKEN_PREFIX_LENGTH)}${MASKED_VALUE}${token.slice(-TOKEN_SUFFIX_LENGTH)}`;
}

const CIRCULAR_PLACEHOLDER = "[Circular]";

/**
 * 객체에서 민감한 필드를 마스킹한 복사본을 반환한다.
 *
 * 원본 객체는 변경하지 않는다. 배열은 원소를 순회하며 재귀 적용해 `items[].paymentKey`
 * 같은 중첩 케이스도 누락 없이 마스킹한다. 순환 참조는 `[Circular]` 플레이스홀더로 단락
 * 처리해 stack overflow를 방지한다.
 * @param obj - 마스킹 대상 객체
 * @returns 민감 필드가 `***`로 치환된 복사본
 */
export function maskSensitiveFields(
  obj: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!obj || typeof obj !== "object") return obj;
  return maskObject(obj, new WeakSet<object>());
}

function maskObject(
  obj: Record<string, unknown>,
  visited: WeakSet<object>,
): Record<string, unknown> {
  if (visited.has(obj)) {
    return { [CIRCULAR_PLACEHOLDER]: true };
  }
  visited.add(obj);

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    masked[key] = SENSITIVE_KEYS.has(key)
      ? MASKED_VALUE
      : maskValue(value, visited);
  }
  return masked;
}

function maskValue(value: unknown, visited: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    if (visited.has(value)) return CIRCULAR_PLACEHOLDER;
    visited.add(value);
    return value.map((item) => maskValue(item, visited));
  }
  if (value && typeof value === "object") {
    return maskObject(value as Record<string, unknown>, visited);
  }
  return value;
}
