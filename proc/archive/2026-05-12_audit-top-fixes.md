# 디자인 Audit Top 4 Fix

## 목표
어제 디자인 audit에서 발굴된 상위 4 fix를 한 PR로 정리·머지.

## 배경
- 어제 12장 스크린샷 + 4축(시각·a11y·UX·반응형) audit 진행
- 상위 4 fix가 도출됨 (manage-mobile padding, breadcrumb 중복, 사이드바 "홈" 중복, 빌더 layout grid)
- 산출물(스크린샷·리포트)은 보존 안 함 — git 미커밋

## 작업 항목

### Fix #1 — manage-mobile 하단 padding (취소)
- [x] **취소** — `app-shell.tsx`에 이미 `pb-24 md:pb-10` 적용됨. 실제 viewport 캡처(`fullPage: false`)로 재확인 결과 BottomNav 가림 없음. audit `fullPage: true` 캡처 artifact였음

### Fix #2a — breadcrumb 중복 제거
- [x] `nav-config.ts` `buildBreadcrumb` 로직 수정 — domain 라벨이 root와 같으면 trail push 안 함
- [x] `풀림 플래너 > 시간표 관리`로 단축 (4 라우트 viewport 확인)

### Fix #2b — 사이드바 L1 "홈" 정리
- [x] `nav-config.ts`에서 `studentHomeItem` export 삭제, `studentNav`에서 제거
- [x] `app-sidebar.tsx`에서 별도 NavRow 블록 + divider 제거 — 풀림 플래너 도메인부터 시작
- [x] BottomNav의 "홈" 라벨은 유지

### Fix #3 — 빌더 layout 탭 grid 재조정
- [x] `decorate-section.tsx` 본문 grid: `1fr:320px` → `1fr:420px`
- [x] 팔레트 grid: `grid-cols-2` → `grid-cols-2 lg:grid-cols-3` (3+3+1)

### 검증
- [x] `bunx tsc --noEmit && bun run lint` 통과 (새 error 없음)
- [x] Playwright viewport 검증 4 라우트 모두 통과
- [x] mobile viewport에서 manage 페이지 활성화 버튼 가림 없음 확인

### 정리
- [x] PR #7 `feat/audit-top-fixes` 생성·머지 (commit `8c080f8`)
- [x] 본 plan archive 이동

## 결과 (2026-05-12)

- PR #7 머지 완료 — main `8c080f8`
- 3개 fix 모두 viewport 검증 통과, lint/tsc clean
- Fix #1(manage-mobile pb-24)은 진행 전 false positive로 판명되어 취소 — 이미 `pb-24 md:pb-10` 적용된 상태였고 audit의 `fullPage:true` 스크린샷이 sticky 요소를 잘못 렌더링한 artifact였음
- Vercel main 자동 배포 webhook 여전히 미복구 → 사용자가 대시보드에서 수동 Promote 필요

## Vercel 사후 (별개)
- main 자동 배포 webhook 미작동 → 머지마다 수동 Promote 또는 reconnect 마무리 필요
