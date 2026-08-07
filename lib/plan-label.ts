// 프로필 드롭다운의 플랜 배지 라벨 — **pullim-web `lib/os/service-features.ts` 의 osPlanLabel 미러**.
//   QA(OS) #91: "풀림OS 계정의 프로필 드롭다운 UI와 일치되어야 함".
//
// 판정 권위는 서버 엔타이틀먼트(`GET /me/entitlements` 의 flags)다. 플래너가 자체 판정하면
//   결제/만료 직후 OS 와 다른 배지를 보이게 된다.
//
// flag 레벨 규약(pullim-api): 0=없음 · 1=기본(무료 포함) · 2 이상=유료. **하나라도 2 이상이면 '유료'**.

/** `/me/entitlements` 의 flags — 서비스 키 → 레벨. */
export type EntitlementFlags = Record<string, number>;

/**
 * 플랜 배지 라벨. flags 를 **받은 뒤**에만 라벨이 나온다.
 *
 * `null`(조회 전·실패)과 `{}`(조회 성공·유료 없음)를 구분하는 게 요점이다 — 둘을 합치면
 * 조회 실패한 유료 회원에게 '기본' 을 단정해 보여주게 된다. 모르면 배지를 그리지 않는다.
 */
export function osPlanLabel(flags: EntitlementFlags | null | undefined): string {
  if (!flags) return '';
  return Object.values(flags).some((level) => level >= 2) ? '유료' : '기본';
}
