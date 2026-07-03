/**
 * 기능 플래그 — prod 노출 게이트.
 *
 * 루틴은 출시 시점에 **mock(미영속)**이라 prod 노출을 막는다(spec 2026-06-24_lnb-routine §9 게이트).
 * 운영 노출은 **전용 플래그 `NEXT_PUBLIC_ROUTINE_ENABLED`로만** 통제한다
 * (auth/dev 우회용 `DEV_AUTH_BYPASS`와 분리 — bypass만 켠 preview/staging에서 루틴이 새지 않도록).
 * - dev/preview: `.env.local`·Vercel env 에 `NEXT_PUBLIC_ROUTINE_ENABLED=1`
 * - prod: 미설정 → **기본 차단**(safe-by-default). 실 BE(06-30) 준비 후 플래그로 오픈
 */
export const ROUTINE_ENABLED = process.env.NEXT_PUBLIC_ROUTINE_ENABLED === '1';

/**
 * 성장 리포트 — soft open(2026-07-10)까지 BE(회고·리포트 표면)를 준비하기 어려워
 * mock 화면 노출을 막는다. off면 LNB·하단탭에서 항목 제외 + `/planner/reports` redirect
 * (루틴 게이트와 동일 패턴). 온보딩 가이드의 "출시 예정" 카드로만 예고한다.
 * - 로컬/preview 확인용: `NEXT_PUBLIC_REPORTS_ENABLED=1`
 * - dev·prod 기본: 미설정 → **차단**(safe-by-default). BE 준비 후 플래그로 오픈
 */
export const REPORTS_ENABLED = process.env.NEXT_PUBLIC_REPORTS_ENABLED === '1';
