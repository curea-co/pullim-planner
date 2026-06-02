import { ErrorMessages } from "./error-messages.constant";

/**
 * PostgreSQL unique constraint 위반 시 detail 필드의 컬럼명 → ErrorMessage 매핑.
 * 새로운 unique 컬럼 추가 시 여기에 매핑을 등록한다.
 *
 * `QueryFailedExceptionFilter` 가 23505(unique violation)의 `detail`
 * (예: `Key (email)=(a@b.com) already exists.`) 에서 아래 키 문자열을 substring 매칭해
 * 해당 ErrorMessage 를 고른다. 매칭이 없으면 generic `COMMON_CONFLICT` 로 떨어진다.
 *
 * auth 가입 동시성(race): signup 의 트랜잭션 밖 preflight 중복 검사는 동시 요청을 막지
 * 못하므로, 최종 방어선은 `uq_auth_users_email` partial unique index 다. 이 위반이
 * 사용자에게 `USER_EMAIL_DUPLICATED` 로 안정적으로 내려가도록 매핑을 등록한다 (codex #40).
 *
 * 더 구체적인 키(`(provider, provider_id)`)를 앞에 둬 더 일반적인 `(email)` 보다 먼저
 * 검사되게 순서를 유지한다.
 */
export const UNIQUE_CONSTRAINT_MAP: ReadonlyArray<
  [column: string, error: { code: string; message: string }]
> = [
  // EMAIL 제공자 (provider, provider_id) 유니크 — 동일 이메일 재가입 경합도 결국
  // 이메일 중복이므로 동일 메시지로 통일한다.
  ["(provider, provider_id)", ErrorMessages.USER_EMAIL_DUPLICATED],
  // auth_users.email 유니크 (uq_auth_users_email).
  ["(email)", ErrorMessages.USER_EMAIL_DUPLICATED],
];
