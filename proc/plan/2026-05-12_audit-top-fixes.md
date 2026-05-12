# 디자인 Audit Top Fix

## 목표
어제 디자인 audit 상위 항목을 PR로 정리·머지.

## 작업 항목

### manage-mobile 하단 패딩 fix (5분, audit Top #1)
- [x] pb-24 또는 safe-area-inset 추가 — BottomNav 가림 해결

> ⚠ 실제로는 `app-shell.tsx`에 이미 `pb-24 md:pb-10` 적용된 상태였음. audit `fullPage:true` 스크린샷이 sticky 요소를 잘못 렌더링한 artifact였음을 실제 viewport 캡처로 확인. **별도 코드 변경 없음**.

### IA 정리 PR (audit Top #2 + #3, 합쳐서 한 PR)
- [x] breadcrumb 중복("풀림 플래너 > 풀림 플래너 >") 제거
- [x] 사이드바 L1 "홈" 제거 또는 명칭 변경 — 단일 도메인이라 의미 없음

### 빌더 layout 탭 grid 재조정 (audit Top #4, 20분, 가능하면)
- [x] 미리보기:컨트롤 minmax(0,1fr):420px
- [x] 팔레트 3열 정렬

## 결과
- PR #7 머지 완료 (main `8c080f8`)
- 3개 fix 묶음 commit `2963a1a` — `feat/audit-top-fixes` → main
- Playwright viewport 검증 4 라우트 모두 통과, tsc + lint clean

## Vercel 사후 (별개)
- main 자동 배포 webhook 여전히 미복구 → 머지마다 수동 Promote 필요. Settings → Git 재연결로 근본 해결 권장.
