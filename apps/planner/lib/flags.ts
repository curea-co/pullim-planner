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

/**
 * 약점 자동 반영(풀림 분석) — BE 미구현: `weaknessAutoReflect` 플래그는 저장만 되고
 * 약점(mastery) 분석 표면·스케줄 엔진 소비가 없다(2026-07-05 실사). off면 위저드
 * STEP 6이 mock 약점 목록 대신 "출시 예정" 예고를 보여주고 항상 false 로 저장한다.
 * 온보딩 가이드 5번 카드로만 예고. 켜지더라도 **기본 상태는 체크 해제**(사용자 확정).
 * - 로컬/preview 확인용: `NEXT_PUBLIC_WEAKNESS_ENABLED=1`
 * - dev·prod 기본: 미설정 → **차단**(safe-by-default). 분석 BE 준비 후 플래그로 오픈
 */
export const WEAKNESS_ENABLED = process.env.NEXT_PUBLIC_WEAKNESS_ENABLED === '1';

/**
 * 알림(리마인더·푸시) — BE 미구현: 위저드 리마인더 STEP의 토글(`remindPush`·`remindBefore5min`·
 * `parentDailyReport`)은 Planner 메타에 저장처가 없고, 앱이 닫혀도 울리는 실 알림은 웹푸시 발송
 * 인프라(서비스워커+구독 저장+스케줄러+VAPID)가 FE·BE 양쪽에 전무하다(2026-07-09 실사). off면
 * 위저드에서 리마인더 STEP을 제외하고 미리보기 요약의 알림 줄도 숨긴다(routine 게이트와 동일 패턴).
 * 헤더 벨(`/planner/notifications`)은 유지하되 실 알림 없으므로 빈 상태를 보인다.
 * - 로컬/preview 확인용: `NEXT_PUBLIC_NOTIFICATIONS_ENABLED=1`
 * - dev·prod 기본: 미설정 → **차단**(safe-by-default). 웹푸시 파이프라인 준비 후 플래그로 오픈
 */
export const NOTIFICATIONS_ENABLED = process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED === '1';
