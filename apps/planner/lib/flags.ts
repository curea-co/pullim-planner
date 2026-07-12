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

/**
 * 풀림 Q 연계(블록 → 풀이 직진입) — Q 연계 서비스 미개통: 라우팅 대상(무한풀기·튜터 등)이
 * 플래너 밖 미구현 표면이라, 구독 여부와 무관하게 **블록 CTA 진입**이 열리면 안 된다(2026-07-10 QA).
 * off면 `hasQAccess()`가 항상 false → 모든 진입 CTA가 "연계 서비스 준비 중" 안내로 일치
 * (콘솔 `setQAccess(true)` 데모 훅도 게이트에 막힘). Q 연계 개통 시 on → 구독 체크로 복원.
 * ⚠️ 스코프 = **플래너 블록 → Q 풀이 딥링크만.** 헤더 서비스 스위처의 "문제큐 앱 이동"
 * (q.pullim.ai 톱레벨 핸드오프)은 OS 정본이 live 로 노출하는 별개 표면이라 이 게이트 밖이다.
 * - 로컬/preview 확인용: `NEXT_PUBLIC_Q_LINK_ENABLED=1`
 * - dev·prod 기본: 미설정 → **차단**(safe-by-default)
 */
export const Q_LINK_ENABLED = process.env.NEXT_PUBLIC_Q_LINK_ENABLED === '1';

/**
 * 홈 "오늘 회고" — BE 미구현: `dailyReflection()`·`tomorrowDifferences()`가 전부 mock
 * 계산이고 회고 결과를 저장·소비하는 BE 표면이 없다(위저드 STEP 6 약점과 동일 맥락 —
 * mock 데이터를 실제처럼 노출, 2026-07-10 QA). off면 홈 일간 뷰 하단 리본을 숨긴다.
 * `BlockCompleteDialog`의 "오늘 학습 마감" scroll anchor는 대상 요소가 없으면 안전하게
 * no-op(옵셔널 체이닝) — 별도 분기 불요.
 * - 로컬/preview 확인용: `NEXT_PUBLIC_REFLECTION_ENABLED=1`
 * - dev·prod 기본: 미설정 → **차단**(safe-by-default). 회고 BE 준비 후 플래그로 오픈
 */
export const REFLECTION_ENABLED = process.env.NEXT_PUBLIC_REFLECTION_ENABLED === '1';
