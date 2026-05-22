# audit #5~#8 spot check 캡처 매트릭스 — 2026-05-19

## 목적

audit #5(timeline trim) · #6(demo dead-end) · #7(builder min-h) · #8(reports day 정보감) 4건이 production에서 회귀 없이 살아있는지, 그리고 본 PR #20 (SPEC sync + 12 stage planner signatures, 머지 commit `37059b5`)이 prod에 반영된 뒤에도 시그니처 surface가 유지되는지 spot check.

## 실행

- 스크립트: [2026-05-19_audit-capture-matrix.mjs](./2026-05-19_audit-capture-matrix.mjs)
- 캡처 위치: `/tmp/pullim-audit-matrix/2026-05-19/`
- 대상: `https://pullim-planner.vercel.app`
- viewport 2축: mobile 375×812 / desktop 1440×900 (deviceScaleFactor 2)
- 시그니처 검증 방식: 렌더링 완료 후 `page.content()` HTML에서 시그니처 문자열 `includes` 검사 (서버 HTML 단독이 아닌 client hydration 이후 풀 DOM 기준)

## 매트릭스

| # | audit | URL | 시그니처 | mobile 375 | desktop 1440 | 회귀 |
|---|---|---|---|---|---|---|
| 5 | timeline trim | `/planner` | `전체 24h` 토글 | ✅ sig present | ✅ sig present | 없음 |
| 6 | demo dead-end | `/planner/manage/new` | `이전` 버튼 | ✅ sig present | ✅ sig present | 없음 |
| 7 | builder min-h | `/planner/manage/new` (Step 2~3 진입) | `min-h` 클래스 | ✅ sig present | ✅ sig present | 없음 |
| 8 | reports day 정보감 | `/planner/reports?view=day` | `오늘 회고` (TodayReflection) | ✅ sig present | ✅ sig present | 없음 |

## production fetch hash 매칭

- `curl -sI https://pullim-planner.vercel.app/planner` →
  - `x-vercel-cache: HIT`
  - `etag: "fbadba3d47696659b474cbf2b2ec9692"`
  - 2026-05-19 08:10:29 GMT 시점 응답
- PR #20 머지 commit `37059b5` 이후 `vercel --prod` 배포 완료 (`dpl_De98JN6yDTZmQQkgXhBTzTueHQU5`, target=production, readyState=READY)
- 8 캡처 모두 PR #20 머지 이후 시점의 production 응답에서 수행됨 — 자동 prod fetch hash 매칭 (배포 직후 → spot check → 동일 etag 응답 구간 안)

## 회귀 결과

- **8/8 캡처 성공, 8/8 시그니처 present**
- audit #5·#6·#7·#8 모두 회귀 없음
- audit #8은 reports 기본 view가 `week`이라 `?view=day` 명시 진입 필요 — 첫 실행 때 false negative 1건 발생 → 스크립트의 audit #8 URL을 `?view=day`로 수정 후 통과
- 후속 plan 트리거 없음 (현재 기준)

## 한계 / 후속

- 시그니처 문자열 검사만으로는 *시각 회귀*는 검출 못 함 (DOM에 있어도 가려지거나 깨질 수 있음). 시각 회귀까지 잡으려면 캡처 diff(어제 baseline 대비 pixel diff)가 필요 — 본 spot check 범위 외, 별 plan 후보.
- audit #5~#8 시그니처가 *PR #20의 5단 색문법·D-day Tier·컨디션·번아웃 분리 등으로 인해 시각적으로* 어떻게 보이는지는 캡처 8장을 사용자가 직접 dogfood로 확인 필요.
- production fetch hash 매칭은 etag 1점만 기록 — viewport별 etag·SSR/CSR 경계별 etag 확장은 별 plan 후보.

## 캡처 파일 목록

```
/tmp/pullim-audit-matrix/2026-05-19/
├── mobile-375-audit5-timeline-trim.png
├── mobile-375-audit6-demo-deadend.png
├── mobile-375-audit7-builder-min-h.png
├── mobile-375-audit8-reports-day-info-density.png
├── desktop-1440-audit5-timeline-trim.png
├── desktop-1440-audit6-demo-deadend.png
├── desktop-1440-audit7-builder-min-h.png
├── desktop-1440-audit8-reports-day-info-density.png
└── results.json
```

## 마감 메모 (2026-05-22)

- **상태**: 완료. G4 합의 응답 2일 연속 없어 PM 단독 결정으로 본 파일 경로 확정.
- **경로 결정 근거**:
  - `proc/knowhow/` = 일회성 spot check·관찰 기록의 표준 위치 (2026-05-12 `extract-feature-and-deploy`, 2026-05-14 `reports-prod-dogfood` 등 동일 패턴)
  - 파일명 prefix `2026-05-19_audit-capture-matrix` = 실행일·도메인·산출물 묶음 명시 → 재참조 시 식별 즉시
  - audit #5~#8은 PR #15~#17 시점 머지된 코드 회귀 검증 spot check 1회로 종결됨 — 후속 시각 회귀 plan은 별 트리거 (한계/후속 §) 발생 시 신규 파일로 분기
- **신규 파일 분기 안 함**: 시각 회귀·viewport별 etag 확장은 별 plan 후보로 위 [`## 한계 / 후속`](#한계--후속) 절에 이미 명시. 본 파일은 그대로 종결, 후속 작업은 신규 파일/plan으로 시작.
- **공개 산출물 추적**: 본 파일과 PR #28에서 완결. 후속 트리거 시 신규 파일/plan으로 분기.
