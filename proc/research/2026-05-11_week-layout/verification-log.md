# PR #4 Test Plan 자동 검증 로그

날짜: 2026-05-11
대상: `feat/timetable-week-layout` (PR #4)
도구: Playwright (chromium headless) → `verify-week-layout.mjs`
환경: `bun dev` (localhost:3030)

## 검증 항목

### Test 1: 4종 weekLayout × 7종 palette 토글 (pl_001)

`/planner/manage/pl_001/edit?tab=layout` → 미리보기 [주간] 탭 → 28개 조합 클릭.

판정 기준:
- 라디오 체크 상태 일치 (week-layout + palette)
- DecorateSection 가시
- 콘솔/페이지 에러 0건

결과: **28/28 PASS · 에러 0건**

### Test 2: 시드 3건 디폴트

| 플래너 | 기대 weekLayout | 기대 palette | 결과 |
|---|---|---|---|
| pl_001 (active) | matrix_by_type | pullim_blue | ✅ |
| pl_002 (inactive) | school_grid | forest | ✅ |
| pl_003 (archived) | heatmap | sunset | ✅ |

## 재실행

```bash
cd /tmp/brand-verify
BASE_URL=http://localhost:3030 node /Users/curea/dev_git/pullim-planner/proc/research/2026-05-11_week-layout/verify-week-layout.mjs
```

(Playwright 의존성은 `/tmp/brand-verify/`에 설치되어 있음 — `bun install`로 복구 가능)
