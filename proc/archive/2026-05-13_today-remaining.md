# 2026-05-13 — 남은 작업

## 목표
오늘 09:30 약속 중 미진행 항목 마무리 + C-2(회고/리포트) 1단계 출발.

## 배경
- 오늘 완료된 것:
  - PR #7(audit Top fixes) + PR #8(Rich link embedding) **production 반영** — `vercel --prod`로 즉시 배포 (Git webhook 우회). 75/75 메타 PASS + 3축 PR #7 PASS
  - C-2 회고/리포트 강화 **plan 작성** (`proc/plan/2026-05-13_reports-enhancement.md`)
  - `rich-link-embedding` plan archive 이동
- 미진행 또는 진행 가능한 항목:
  - **Vercel Git integration 근본 복구** — CLI(`vercel --prod`)로 우회는 가능하나 자동 webhook은 여전히 미작동
  - 회고/리포트 강화 **1단계(갭 분석)** 부터 출발 가능

## 작업 항목

### 1. 회고/리포트 강화 1단계 — 갭 분석 (~1h) *(AI)*
- [ ] reports 컴포넌트 3개 spot check — 어떤 mock 데이터가 UI에 노출되고 있는지
  - `src/components/planner/today-reflection.tsx`
  - `src/components/planner/reports/weekly-summary.tsx`
  - `src/components/planner/reports/monthly-summary.tsx`
- [ ] mock 데이터(`planner.ts` L254~) 활용도 비교표 작성 — 미노출 데이터 식별
- [ ] desktop + mobile viewport 캡처 (3 view × 2 viewport = 6장)
- [ ] 갭 분석 결과를 `proc/plan/2026-05-13_reports-enhancement.md` 1단계에 채움

### 2. 회고/리포트 강화 2단계 — 우선 fix 도출 (~30분) *(AI + 사용자 확인)*
- [ ] 갭 분석 결과로 fix 후보 3~5개 추출 (impact × 작업량)
- [ ] 사용자에게 우선순위 확인 → 첫 fix 1~2개 확정
- [ ] `proc/plan/2026-05-13_reports-enhancement.md` 2단계 갱신

### 3. (선택) Vercel Git integration 근본 복구 *(사용자 영역)*
- [ ] Vercel 대시보드 → **Settings → Git** → Production Branch = `main` 확인
- [ ] "Connected Git Repository" 상태 점검 — 끊겼으면 Disconnect → Reconnect 다시 처음부터
- [ ] 검증: 빈 commit push 또는 다음 머지 후 GitHub Deployments API에 main commit 등록되는지

### 4. (선택) 기존 plan 정리 *(AI, 사용자 archive 결정 시에만 이동)*
- [ ] `proc/plan/2026-05-13_prod-followup-and-next.md` 결과 섹션 갱신 (A·B·C 완료 표시)
- [ ] 본 plan(`2026-05-13_today-remaining.md`) 결과 갱신

## 우선순위
1. **1·2 (reports 갭 분석 + fix 도출)** — AI 작업, 즉시 진행 가능
2. **3 (Vercel reconnect)** — 사용자 영역, 시간 될 때
3. **4 (plan 정리)** — 마무리 작업, archive는 사용자 명시 시

## 참고
- C-2 본 plan: `proc/plan/2026-05-13_reports-enhancement.md`
- 어제 Vercel/PR plan: `proc/plan/2026-05-13_prod-followup-and-next.md`
- 슬랙 unfurl 진단: 코드 정상 (75/75 메타 + og:image 200), 클라이언트 캐시 우회 시 즉시 노출. 1~수시간 후 자연 해결
