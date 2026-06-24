/**
 * 기능 플래그 — prod 노출 게이트.
 *
 * 루틴은 출시 시점에 **mock(미영속)**이라 prod 노출을 막는다(spec 2026-06-24_lnb-routine §9 게이트).
 * - dev(로컬): `NEXT_PUBLIC_DEV_AUTH_BYPASS=1` 이면 자동 노출
 * - preview: `NEXT_PUBLIC_ROUTINE_ENABLED=1` 명시 시 노출
 * - prod: 둘 다 미설정 → **기본 차단**(safe-by-default). 실 BE(06-30) 준비 후 플래그로 오픈
 */
export const ROUTINE_ENABLED =
  process.env.NEXT_PUBLIC_ROUTINE_ENABLED === '1' ||
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';
