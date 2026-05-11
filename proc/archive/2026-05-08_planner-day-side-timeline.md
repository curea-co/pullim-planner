# 풀림 플래너 — 일간 시각화 시계 → 사이드 24h 트래커 전환

## 목표
- 일간 좌측 패널의 **24h 원형 시계(Clock24) → 좌 시간 라벨 + 우 분 단위 셀의 사이드 트래커**(SideTimeline24)로 교체
- 공스타그램 레퍼런스 분석 50장 중 압도적 표준(11장 = 22%, 시계형은 1장 = 2%)에 정렬
- 풀림 플래너의 *시그니처*를 시계형 → 사이드 트래커로 재정의

## 근거
- [proc/research/2026-05-08_gongstagram-timetable-reference/report.md](../research/2026-05-08_gongstagram-timetable-reference/report.md)
  - "**시계형은 50장 중 1장**(33번)" + "사용자 거부 형태"로 명시
  - 표준 IA: "좌 과목별 to-do + 우 24h 사이드 트래커" (11장 1위)
  - 시각화 핵심: "**셀 채색** — 한 시간을 막대로 채워 *이 시간대에 이 과목 했다*를 표현"
  - 시사점 1순위: "**시계형 → 사이드 24h 그리드 전환**"

## 현재 상태

### day-view 좌측 패널
```tsx
<section> {/* 시계 카드 */}
  <header>오늘 24시간 + 색상 범례 토글</header>
  <Clock24 blocks={todayBlocks} ddayLabel={ddayLabel} conditionTone={condition} />
  {next && <NextBlockCard />}
  {showLegend && <Legend />}
</section>
<ConditionBurnoutPanel />
```
- 280×280 SVG 시계 + 중앙 허브(완료/총)
- 다음 블록 카드는 시계 아래

### Clock24 사용처
- `views/day-view.tsx` — 메인 일간 좌측
- `planner/onboarding/page.tsx` — 온보딩 시각화

## 의사결정

### D1. 시간 범위
**결정**: **00:00–24:00 풀**. 하루 전체를 한 화면에.
- 종이 플래너(공스타그램 표준 b 변형)와 정합
- 야간형/새벽형 사용자도 한 그리드 안에서 표현 가능
- 좌측 카드 세로 길이가 길어질 수 있음 → D9에서 처리

### D2. 단위 셀
**결정**: **30분 단위** (1시간 = 2셀, 24×2 = **48셀**). 보수적 타협값.
- *진짜 표준은 1시간 단위*지만 풀림 블록은 30분/45분/60분/90분 등 다양 → 1시간 단위면 짧은 블록 시각이 뭉개짐
- 10분·15분은 너무 잘게 쪼개 가독성↓
- 30분 = 종이 플래너에서도 흔함 + 풀림 데모 블록의 시작·끝이 거의 30분 경계
- 30분 경계 아닌 블록 (예: 9:15–9:45)은 round half-up: 시작 셀(9:30)부터 끝 셀(9:30) 채움 — 1셀로 단순화. 정확도 부족 시 후속에서 absolute overlay로 마이그레이션

### D3. 셀 시각 — status 매핑
**결정**:
| status | 채색 |
|---|---|
| `doing` | 과목 컬러 100% + 좌측 ring 강조 (현재 시각 표시) |
| `done` | 과목 컬러 65% (살짝 빠진 톤) |
| `todo` | 과목 컬러 25% (옅게 — *예정* 시각화) |
| `skipped` | `pullim-warn` 25% + 빗금(diagonal-stripe) |
| `break` | `pullim-slate-200` 50% |
| 빈 셀 | `bg-pullim-slate-50` |

→ 종이 형광펜 막대의 디지털 번역. 예정 블록까지 옅게 보여줘 *오늘 일과 전체*를 한눈에.

### D4. 현재 시각 라인
**결정**: 사이드 트래커에 **가로 빨간 라인**으로 현재 시각 표시 (`pullim-danger` 1.5px).
- 위치: `(now - 06:00) × cellHeight` offset
- SSR mismatch 회피: 첫 페인트는 18:50 고정 → useEffect로 매분 갱신 (Clock24와 동일 패턴)

### D5. 헤더 위젯
**결정**: 사이드 트래커 *위*에 컴팩트 헤더 한 줄.
- `D-day` (수능 디데이, 기존)
- `누적 시간` (오늘 예정 vs 완료, 예: `2.4h / 5.0h`)
- `완료 블록 수` (예: `3/8`)
- 색상 범례 토글(현재 동작) 유지 — 헤더 우측

→ research에서 D-day · Total time · Day n/66을 헤더에 두는 패턴이 거의 모든 일간 페이지에 있음. 여기서는 풀림 데이터에 맞게 D-day · 누적 시간 · 완료/총 블록.

### D6. 다음 블록 카드
**결정**: 사이드 트래커 *아래* 그대로 유지. 디자인 변동 없음.
- "지금 시작" CTA + Q 사용권 게이팅(이전 plan에서 적용)도 그대로

### D7. ConditionBurnoutPanel
**결정**: 위치·동작 변동 없음.

### D8. Clock24 컴포넌트 운명
**결정**: **삭제**. 풀림에 시계는 없는 것으로 못박음.
- onboarding도 사이드 트래커로 교체
- `src/components/planner/clock-24.tsx` 파일 자체 제거
- 향후 분석 페이지의 도넛 차트가 필요하면 *그때 새로* 만든다 (Recharts 등 활용). Clock24의 SVG 호 그리기 로직을 재활용하지 않음 — 자산 부채 남기지 않기

### D9. 좌우 height 정합 + 카드 길이 제어
**결정**: 사이드 트래커는 24h × 2셀 = 48셀. 셀 height 12px 가정 시 그리드 자체 ≈ 576px.
- 좌측 카드 = 헤더 + 그리드 + 다음 블록 카드 → 약 700–800px
- ConditionBurnoutPanel은 이미 좌측 컬럼 *밖*에 stack 되어 있음 → 좌측 컬럼 전체 height = 카드 + Panel
- 우측 리스트는 8개 블록 × ~50px ≈ 400px → 좌측이 더 길 가능성
- 처리: **그리드만 max-height로 스크롤**(예: `max-h-[480px] overflow-y-auto`) + 현재 시각 라인이 보이도록 초기 scrollTop 조정. 사용자가 24h 전체를 보고 싶으면 스크롤로 접근
- 데모 시연에서 *1차 보이는 영역*은 06:00–24:00 (스크롤 없는 첫 화면)

### D10. 셀 hover/click 인터랙션
**결정**: 본 plan은 **읽기 전용**. 셀 hover 시 native `title`로 "HH:MM–HH:MM · 블록 제목 · 상태" 노출.
- 셀 클릭으로 블록 카드 highlight·scroll 같은 인터랙션은 후속 plan
- research 시사점 2번 "셀 탭/드래그로 슬롯 채우기"(Toggl 류)는 풀림 모델과 다른 결 — 풀림은 *블록이 자동 배치된 결과 시각화*가 본질. 사용자가 셀을 직접 칠하지 않음

## 작업 범위
- **신규**: `src/components/planner/side-timeline-24.tsx`
- **수정**: `src/components/planner/views/day-view.tsx` (Clock24 → SideTimeline24)
- **수정**: `src/app/(student)/planner/onboarding/page.tsx` (Clock24 → SideTimeline24)
- **삭제**: `src/components/planner/clock-24.tsx`

## 작업 항목

### A. SideTimeline24 컴포넌트
- [x] Props: `blocks: TimeBlock[]`, `now?: string`, `ddayLabel?: string`, `className?: string`
- [x] 시간 범위 00:00–24:00 (24시간), 30분 단위 = 48셀
- [x] Layout: 시간 라벨 컬럼 (w-8) + 분 단위 셀 컬럼, 셀 height 12px
- [x] 블록 채색 매핑 (floor·ceil 기반 spans-through)
- [x] status별 opacity: doing 100% / done 65% / todo 25% / skipped 빗금 / break slate-200 50%
- [x] 빗금: `repeating-linear-gradient(45deg, color 0 3px, transparent 3px 6px)`
- [x] 현재 시각 가로 라인 (`pullim-danger`, 1.5px). 18:50 SSR 첫 페인트 + useEffect 매분 tick
- [x] doing 블록 셀 좌측 강조 (`border-l-[3px] border-pullim-blue-700`)
- [x] 그리드 wrapper `max-h-[480px] overflow-y-auto` + mount 시 06:00 부근 자동 scroll
- [x] 빈 셀 hover 시 title `"HH:MM"`, 점유 셀 hover 시 title `"HH:MM–HH:MM · 블록 제목 · 상태"`

### B. day-view 수정
- [x] Clock24 import → SideTimeline24
- [x] `<Clock24 ... />` → `<SideTimeline24 ... />` (`conditionTone` prop 제거)
- [x] 헤더: "오늘 24시간" → "오늘 일과"
- [x] 누적 시간·D-day·완료 블록 위젯은 SideTimeline24 내부 헤더로 통합 (day-view section header는 단순 유지)
- [x] 다음 블록 카드 + ConditionBurnoutPanel 변동 없음

### C. onboarding 수정
- [x] `Clock24` import → `SideTimeline24`
- [x] `<Clock24 ... />` → `<SideTimeline24 blocks={todayBlocks} ddayLabel={ddayLabel} now="18:50" />`
- [x] step 1 카피 갱신: "24시간 원형 시계" → "24시간 사이드 트래커", bullet · screenshotCaption 모두 보정
- [x] MockBrowser 안 layout: `flex justify-center` → `p-3` (사이드 트래커는 세로형)

### D. clock-24.tsx 삭제
- [x] `src/components/planner/clock-24.tsx` 파일 제거
- [x] 잔존 import 0건 (grep 확인)

### E. 검증
- [x] `bunx tsc --noEmit` 통과
- [x] `bun run lint` — 우리 touched 파일 0 errors
- [x] 라이브 200 OK — `/planner?view=day`, `/planner/onboarding`
- [x] **day-view 캡처** (1440×900): 사이드 트래커 + 블록 색칠 + 현재 시각 라인 + 좌우 height 정합 확인 (`verify-day-side-timeline.png`)
- [x] **onboarding 캡처**: step 1 MockBrowser 안에 사이드 트래커 자연 통합 (`verify-onboarding-side-timeline.png`)
- [x] **DOM 검증**:
  - 48 cells (24h × 2)
  - 빈 셀 title `"00:00" / "00:30" / "01:00"` 형식
  - 점유 셀 title `"13:30–13:55 · 점심 직후 단어 복습 (어제 누락분) · 미수행"` (skipped) / `"17:30–18:10 · 미분 기본 공식 시각화 · 완료"` (done) / `"18:25–19:25 · 미분 — 적응형 문제 풀이 · 진행"` (doing)
  - scrollTop 자동 조정 (98px) — 새벽 영역 viewport 밖
- [x] doing 블록 좌측 파란 strip · skipped 블록 빗금 · break 회색 시각 확인

## 본 plan 제외 (후속)
- **셀 직접 채색 인터랙션** (Toggl 류 시간 슬롯 채우기) — 풀림 모델과 결 다름, 별도 검토 필요
- **시간 단위 옵션** — 30분/15분/10분 토글. 보수적 30분 우선 도입 후 재요청 시 도입
- **테마 시스템** — 라벤더/세이지/라이트블루/흑백/다크 5종, research 9-5
- **인스타 공유 카드 export** — 일과 끝 4분할 카드, research 9-6
- **헤더 한 줄 코멘트** — research 패턴, 그러나 풀림은 TodayReflection이 그 역할
- **분석 페이지 시간 분포 도넛 차트** — 필요 시 Recharts 등으로 *새로* 만든다 (Clock24 코드 재활용 안 함)

## 트레이드오프 메모
- **시계 시그니처 폐기** — Clock24는 풀림 *시그니처 시각화*로 도입됐지만, 표준 부재 + 사용자 거부 = 시그니처 가치보다 가독성·정합성이 우선. 본 plan으로 시계는 풀림에서 사라짐
- **24h 풀 + 30분 보수안 트레이드오프** — 새벽 시간대(00–06)는 데모 데이터에 없어 첫 화면에서 *빈 영역*으로 보임. 그리드 max-height + 초기 scrollTop 조정으로 6시 부근부터 보이게 처리. 야간형 사용자에게는 위로 스크롤하면 즉시 노출
- **30분 셀의 정확도 한계** — 9:15 같은 비-경계 시각은 round half-up으로 9:30 셀에 매핑. 데모 블록 대부분이 30분 경계 시작이라 영향 미미. 정확도 필요해지면 후속에서 셀=가이드라인 + 블록=absolute overlay로 마이그레이션
- **데이터 변경 없음** — `TimeBlock` 모델 그대로. 시각만 교체. 위험 낮음
- **onboarding 같이 교체** — 일관성 ✓. 시계가 *없는* 풀림이 처음부터 노출됨
