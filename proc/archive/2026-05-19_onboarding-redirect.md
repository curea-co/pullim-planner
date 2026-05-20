# 2026-05-19 — audit #11 onboarding redirect (첫 방문 redirect)

## 목표

신규 사용자가 `/` 또는 `/planner`로 진입했을 때 풀림 플래너의 시그니처(7대 학습과학 + 자기조절 도구)를 발견할 기회가 없는 문제 해결. 현재 `/` → `/planner` 직진 redirect만 있고, `/planner/onboarding`은 sidebar/sheet "소개하기" 메뉴를 통해서만 접근 가능 — 발견성 0.

audit #11 "onboarding redirect"의 의도: **첫 방문 한 번만** onboarding으로 우회. 재방문은 직진.

완료 기준: `bunx tsc --noEmit && bun run lint` 통과 + `/planner` 첫 방문(localStorage 비어있음) 시 `/planner/onboarding`로 자동 진입 + 재방문 시 직진.

---

## 배경

- 2026-05-15 A-1 후보 5건 중 1건 (weekly-summary mobile / builder min-h / 카드 컬러 / **onboarding redirect** / reports day 정보감)
- 현 라우팅:
  - `/` → `redirect('/planner')` (server-side, `src/app/(student)/page.tsx`)
  - `/planner` → 'use client' 홈 (`src/app/(student)/planner/page.tsx`)
  - `/planner/onboarding` → `OnboardingTemplate` 단계 가이드 (sidebar/sheet "소개하기"로만 접근)
- 신규 사용자 첫 진입 패턴: `/` → `/planner` (홈) — onboarding 발견 0%

---

## 1단계 — 갭 분석 매트릭스

| 항목 | 현재 | 기대 |
|---|---|---|
| 첫 진입 경로 | `/` → `/planner` 직진 | `/` → `/planner` → 첫 방문 감지 → `/planner/onboarding` |
| 재방문 | 동일 (`/` → `/planner`) | 동일 (마커 set돼있음) |
| 학생/학부모 분기 | 단일 persona (mock) | 단일 persona 유지 (학부모 라우트 없음) |
| 강제 vs 옵션 | sidebar 메뉴로만 접근 (실질적 발견성 0) | 첫 방문만 강제, dismissible 불필요 |
| 마커 저장소 | 없음 | localStorage (`pullim:visited`) — BE 필요 없음 |

**갭**: 첫 진입 발견성 0 → onboarding 콘텐츠가 사실상 "묻혀 있음".

---

## 2단계 — fix 후보 3안

### 후보 A — localStorage 마커 + client redirect ⭐ 추천

- `/planner/page.tsx`에 `useEffect` 추가:
  - `localStorage.getItem('pullim:visited')`가 null이면
  - `localStorage.setItem('pullim:visited', '1')`
  - `router.replace('/planner/onboarding?firstVisit=1')`
- onboarding finalCta는 이미 `/planner` 직진 → 마커 set돼있어 stay
- 변경 범위: `/planner/page.tsx` 1 파일 / +15 lines
- 효과: 첫 방문 100% onboarding 우회, 재방문 0% (직진)
- 위험: localStorage 비활성 브라우저 → 매 방문 redirect (드물고 큰 영향 아님)

### 후보 B — `/planner` 상단 dismissible banner

- 첫 방문 시 `/planner` 상단에 "5분 가이드 보기" CTA 배너 노출
- × 클릭하면 localStorage 마커 set
- 변경 범위: `/planner/page.tsx` + 신규 컴포넌트 1개 / +50 lines
- 효과: 강제 X, 발견성 ↑, 그러나 클릭하지 않으면 여전히 onboarding 못 봄

### 후보 C — sidebar/sheet "소개하기" dot indicator

- 첫 방문 동안 nav의 "소개하기" 메뉴에 빨간 dot
- 클릭하면 dot 사라짐
- 변경 범위: `nav-config.ts` + `AppSidebar` + 셸 컴포넌트 / +30 lines (셸 작업 — 사용자 명시 필요)
- 효과: 가장 가벼움, 그러나 발견성은 사용자 시야에 nav가 있을 때만

---

## 3단계 — 풀스택 구현 (후보 A 채택)

후보 미정 시 추천 안(A) 진행 — daily_outcome 09:30 약속 명시 룰.

- [ ] `/planner/page.tsx`에 `useEffect` import + 첫 방문 감지 로직 추가
- [ ] localStorage 키 `pullim:visited` (`'1'` set/get)
- [ ] redirect: `router.replace('/planner/onboarding?firstVisit=1')`
- [ ] view 파라미터가 이미 있으면 redirect 스킵 (deep link 보호)
- [ ] `bunx tsc --noEmit && bun run lint` 통과
- [ ] `bun run build` production 빌드 통과

> `?firstVisit=1` 쿼리는 onboarding이 다르게 보일 필요는 없으나 추후 분석/회귀 추적용 마커. 별 plan에서 활용 가능.

---

## 4단계 — PR + production 반영

- [ ] 단일 commit `feat(planner): 첫 방문 시 /planner/onboarding 우회 (audit #11)`
- [ ] PR 생성 + 머지
- [ ] `vercel --prod --yes` 배포 (사용자 명시 슬롯)
- [ ] archive 이동은 사용자 명시 시에만 (메모리 룰)
