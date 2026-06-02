import { Transform } from "class-transformer";

/**
 * 이메일 정규화 데코레이터 — DTO 필드에 붙여 `trim()` + `toLowerCase()` 한다.
 *
 * signup/login/check-email 모두 동일 정규화를 거쳐야 `A@x.com` 과 `a@x.com` 이 같은
 * 계정으로 취급된다. 정규화를 use-case 마다 흩어 두면 한 경로만 빠뜨려 중복 계정/우회
 * 로그인이 생기므로, 단일 진입점(DTO 변환)에서 일괄 처리한다 (codex #40 round-2).
 *
 * 저장(unique index)·조회·해시 입력 모두 이 정규화된 값을 쓰므로 unique 제약과도 일치한다.
 *
 * @returns PropertyDecorator
 */
export function NormalizeEmail(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  );
}
