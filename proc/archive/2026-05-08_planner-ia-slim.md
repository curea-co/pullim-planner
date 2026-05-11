# 풀림 플래너 IA·정보 다이어트

## 목표
플래너의 정체성을 **"시간 자기조절"** 한 가지로 좁히고, 학생 홈·Q 도메인·마케팅·온보딩 영역과 섞여 있는 정보를 분리한다. 학생이 진입 후 3초 안에 "지금 뭘 시작하나"를 결정할 수 있는 화면 밀도로 슬림화.

작업 범위: `src/app/(student)/planner/**`, `src/components/planner/**`. 공유 영역(학생 홈·`components/study/*`·`components/shell/*`)·spec 문서·다른 도메인은 본 plan에서 제외.

## 작업 항목

### A. 홈 `/planner` — "오늘 한 화면" 압축
- [x] **제거: 학생 홈 위젯** — `WeakSpotCard`, `TodayActionCards` 임포트·사용 제거.
- [x] **제거: SectionIntro 마케팅 박스** — identity / values / subRoutes / preview 통째 제거. NEXT BLOCK + QuickStat을 단순 grid로 끌어올림.
- [x] **제거: 영역 중복** — `WeeklyChart` / "AI가 매일 재최적화해요" 배너 / `FlywheelNote` 모두 제거.
- [x] **남기고 강화: 핵심 3섹션** — PageHeader, NEXT BLOCK hero + QuickStat 3개 grid, 신규 `TodayTimeline`(8칩), "캘린더에서 자세히" CTA.

### B. day view — 자기보고 통합 + 노이즈 제거
- [x] **신규 통합 패널: `ConditionBurnoutPanel`** — `components/planner/condition-burnout-panel.tsx`. 기본 collapsed ribbon (`🙂 보통 · ❤️ 64/100`), 펼치면 ConditionSlider + BurnoutCard 두 카드 노출. day-view가 condition state를 들고 있어 ribbon도 함께 갱신.
- [x] **시계 색상 범례 슬림화** — 시계 카드 헤더 우측에 `Eye/EyeOff` 토글 (`aria-expanded`). 기본 hide.
- [x] **FlywheelNote 제거** — day view 하단의 플라이휠 메시지.

### C. week view — 큰 그림 보강
- [x] **색상 범례 추가** — WeekGrid 헤더에 7타입 범례 inline. day view에서 collapse, week view에서는 default 노출.

### D. 사이드바 / IA
- [x] **`plannerSection` 5개 유지** — 변경 없음.
- [x] **`/planner` description 갱신** — `nav-config.ts:117` "오늘 미션 + 빠른 진입" → "오늘 한 화면 — 다음 블록 + 진행".

### E. 온보딩 흡수
- [x] **identity·values·flywheel 메시지 이관 검증** — 5스텝이 시그니처(시계·컨디션·번아웃·엔진)·7대 학습과학을 이미 커버. 매일 재최적화 플라이휠 카피를 identity 한 줄에 통합("...오늘 결과(정답률·감정·시간)가 내일 플랜에 자동 반영되는 매일 재최적화 플라이휠.").

## 검증 (작업 마치기 전)
- [x] `bunx tsc --noEmit` — exit 0
- [x] `bun run lint` — 플래너 도메인 0 errors
- [x] 라이브 200 OK 6동선 (`/planner`, `/planner/calendar`, `?view=week|month`, `/planner/builder`, `/planner/onboarding`)
- [x] 라이브 인터랙션 (playwright):
  - 홈: 마케팅/위젯 제거 키워드 검증 0 매치 ✓ + NEXT BLOCK·QuickStat·TodayTimeline·캘린더 CTA 4건 모두 존재 ✓
  - day view: FlywheelNote 제거 ✓, ribbon `aria-expanded=false` default ✓, 색상 범례 `aria-expanded=false` default ✓, ribbon 클릭 시 슬라이더 펼침 ✓
  - 미니 타임라인 8칩 (skipped + done×2 + doing + todo×4) ✓, 첫 칩 클릭 시 `/planner/calendar?view=day` 이동 ✓
  - week view: 색상 범례 7항목(개념/문제풀이/취약점/암기/모의/개념질문/셀프설명) ✓
- [x] 모바일(375px): 가로 overflow 0, NEXT BLOCK h2 bottom 270px, 미니 타임라인 top 510px (한 화면 + 약간 스크롤로 도달)
- [x] day view 모바일: ribbon 높이 62px (작음 — 시계와 경합하지 않음)
- [x] 데스크톱(1280px): grid 1.6:1 split 정상 — NEXT BLOCK 좌측, QuickStat 우측 stack

## 본 plan에서 제외 (글로벌 또는 별도 작업)
- WeeklyChart 자체의 시각 폴리시(Recharts width=-1 첫 페인트)는 별도 폴리시 작업
- 학생 홈(`/`)의 위젯 재구성 — 본 작업으로 학생 홈에 결정 위젯이 남아 있어야 정합. 학생 홈 락인은 별도.
- 모바일 BottomNav 5탭 — 변경 없음 (공유 영역)
- spec drift(03·10) — `/update-spec` 별도

## 트레이드오프 메모
- **감정 지능 시그니처 약화 우려** → ribbon 한 줄로 *항상 보이되 작게* 처리. 첫 진입 시 펼친 상태 default 옵션도 검토 가능.
- **마케팅 카피 사라짐 우려** → onboarding에 흡수. 신규 가입자만 보지만, 데모 단계의 마케팅은 학생 홈/도메인 카드/온보딩 3중 노출이 이미 충분.
- **홈 단순화로 정보가 너무 휑할 우려** → 미니 타임라인(8 블록 칩)이 *오늘 흐름 한눈에* 역할. 빈 공간이 아니라 정렬된 여백.
