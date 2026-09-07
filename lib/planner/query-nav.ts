/**
 * 같은 pathname 안에서 **쿼리만 바꾸는 이동** — Next router 대신 네이티브 History API.
 *
 * ## 왜 router.replace/push 를 쓰면 안 되나
 *
 * Next 16 은 하드 로드 하이드레이션 때 **쿼리가 붙은 URL 을 쿼리 없는 라우트 캐시 키에**
 * 넣는다 — `create-initial-router-state.js` 가 키는 `location.pathname`(`/planner`),
 * 값의 canonicalUrl 은 `createHrefFromUrl(location)`(`/planner?view=month`)로 등록한다.
 * `/planner` 는 서버에서 `searchParams` 를 읽지 않는 **정적 페이지**라
 * `segment-cache/cache.js` 가 `renderedSearch=''` 로 접어, 그 엔트리가 **모든 쿼리 변형의
 * 캐시 히트**가 된다. 이후 `segment-cache/navigation.js` 의
 * `canonicalUrl = route.canonicalUrl + url.hash` 때문에 같은 pathname 으로 가는 모든
 * 클라이언트 내비게이션이 요청 URL 이 아니라 **처음 박힌 URL 로 커밋**되고,
 * `app-router.js` 가 그 값으로 `replaceState` 를 부른다.
 *
 * 결과: `/planner?view=month` 로 하드 로드(새로고침·북마크·링크 공유)하면 그 뒤
 * **뷰 전환과 기간 이동이 전부 무반응**이 된다. 에러도 나지 않는다. (QA 2026-09-04 F-01)
 *
 * ## 왜 네이티브 history 는 되나
 *
 * 라우트 캐시를 거치지 않고, App Router 가 패치한 history 메서드가 `useSearchParams` 와
 * 동기화해 준다 (Next 16 문서 "Linking and Navigating — Native History API").
 * 리포 선례: `NewPlannerContainer.stampCreated` — 거기 주석에 `__NA`/`_N` 을 빼는 이유가
 * 자세히 적혀 있다(그 키가 실려 오면 Next 가 "내부 호출"로 보고 라우터 URL 동기화를
 * 건너뛴다 — 무한루프 방지 분기).
 *
 * ## 쓰는 자리
 *
 * **같은 pathname · 쿼리만 다른** 이동에만 쓴다. 다른 라우트로 갈 때는 `router` 를 쓴다 —
 * 그쪽은 세그먼트 렌더가 필요하고 이 버그의 대상도 아니다.
 */

/** Next 내부 표식을 뺀 현재 history state — 통째로 지우면 뒤로/앞으로 복원이 어긋난다. */
function carriedState(): Record<string, unknown> {
  const prev: unknown = window.history.state;
  const carried: Record<string, unknown> =
    prev && typeof prev === 'object' ? { ...(prev as Record<string, unknown>) } : {};
  delete carried.__NA;
  delete carried._N;
  return carried;
}

/**
 * 현재 엔트리를 덮는다 — 뒤로 갔을 때 중간 상태가 쌓이지 않아야 하는 이동
 * (뷰 전환·기간 이동처럼 "같은 화면의 상태 변경"에 가까운 것).
 */
export function replaceQuery(url: string): void {
  if (typeof window === 'undefined') return;
  window.history.replaceState(carriedState(), '', url);
}

/**
 * 새 엔트리를 쌓는다 — 뒤로가기로 되돌아올 수 있어야 하는 이동
 * (주간·월간 셀에서 일간으로 파고드는 딥링크 등).
 */
export function pushQuery(url: string): void {
  if (typeof window === 'undefined') return;
  window.history.pushState(carriedState(), '', url);
}
