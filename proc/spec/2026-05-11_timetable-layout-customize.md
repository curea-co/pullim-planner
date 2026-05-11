---
title: 풀림 플래너 — 시간표 레이아웃 커스터마이징
date: 2026-05-11
author: pair (curea + agent)
status: spec (feature)
related:
  - proc/research/2026-05-08_gongstagram-timetable-reference/report.md
  - proc/archive/2026-05-08_planner-vertical-bar-q-toggle.md
  - proc/archive/2026-05-08_planner-multi-1-data-model.md
  - proc/archive/2026-05-08_planner-multi-3-manage-page.md
  - proc/archive/2026-05-08_planner-multi-4-home-as-timetable.md
ssot-impact:
  - proc/spec/03-features-and-ia.md (구현 후 update-spec — 시간표 관리 IA에 레이아웃 항목 추가)
  - proc/spec/04-ux-flow.md (구현 후 — 레이아웃 변경 플로우)
  - proc/spec/05-business-rules.md (구현 후 — Planner.layout 검증 규칙)
  - proc/spec/06-content-data.md (구현 후 — mock seed 갱신)
  - proc/spec/08-design-system.md (구현 후 — 옵션 카드 토큰)
---

# 풀림 플래너 — 시간표 레이아웃 커스터마이징

## 0. 한눈에 보기

- 사용자가 시간표를 어떤 모양으로 볼지 *플래너 단위로* 고를 수 있게 한다.
- 현재 일간은 `SideTimeline24` 하나, 주간은 `WeekGrid` 하나로 고정. 다양성 부족.
- 일간 4종 · 주간 4종 옵션 후보. 변경 진입점은 **빌더 페이지(`/planner/manage/[id]/edit`) 안의 "레이아웃" 탭**.
- 데이터 모델은 `Planner` 타입에 `layout: { day, week }` 필드 1개 추가. 글로벌 환경 설정 아님.
- 코드 변경은 본 spec 확정 후 별도 `proc/plan/`에서 단계별로.

## 1. AI 명령 지침

이 명세를 읽고 구현하는 AI는 다음을 지킨다.

- 본 명세는 SSOT(`proc/spec/00-10`) 보조 문서. 충돌 시 SSOT가 우선이며, 구현 완료 후 `/update-spec`으로 SSOT에 통합한다. 본 파일을 단독 진실로 쓰지 말 것.
- 한자어는 풀림 UX writing 정책(`07-branding § 6`) 따라 최소화한다. "활성"보다 "쓰는 중", "비활성"보다 "잠시 보관" 톤. "레이아웃" 같이 자리 잡은 외래어는 그대로 둔다.
- 모든 코드 변경은 `proc/plan/` 작성 → 작업 → `proc/archive/` 순서.
- mock 모듈은 module singleton + `window.__pullim.*` 데모 hook 컨벤션(`subscriptions.ts` 선례)을 따른다.
- 미리보기 컴포넌트는 mock 데이터로 inline 렌더한다. 별도 이미지 asset 만들지 않는다.
- 기본값 유지로 라이브 회귀 없이 도입한다.

## 2. 문제 정의 · 제품 목표

### 2.1 문제
- 풀림 플래너의 일간 시각화는 `SideTimeline24` 하나(공스타그램 분석 기반의 표준 30분 사이드 그리드).
- 주간은 `WeekGrid`(타입×요일 매트릭스) 하나.
- 학생들의 학습 스타일·취향은 한쪽으로 수렴하지 않는다 — 학교 시간표에 익숙한 학생, 시간 막대로 분포만 보고 싶은 학생, 흐름만 칩으로 따라가는 학생이 따로 있다.
- 시즌별로도 다르다. 학기 중엔 학교형, 방학·자습 기간엔 사이드 24h, 시험 직전엔 그래프형이 자연스러운 학생이 있다.

### 2.2 목표
- 사용자가 시간표 레이아웃을 *플래너 단위로* 고를 수 있게 한다.
- 기본값은 그대로 유지(`side-24h` / `matrix-by-type`)해서 라이브 회귀 없다.
- 풀림 다른 IA(블록 카드·완료 모달·Q 구독 게이팅 등)와 충돌하지 않게 시각만 갈아끼우는 분기로 설계한다.

### 2.3 비-목표
- 학습 데이터 모델 변경 없음. `TimeBlock`·`weekView`·`todayBlocks` 등 mock 그대로.
- 컬러 테마(라벤더·세이지 등) 변경 없음.
- 셀 색칠 인터랙션, 헤더 위젯(D-day·Total time 등), 공유 카드 export — 모두 본 spec 범위 외.

## 3. 페르소나 · 사용 상황

| 페르소나 | 특성 | 선호 레이아웃 |
|---|---|---|
| **A. 공스타그램 스타일** | 인스타에서 24h 트래커 익숙, 시간 점유를 색으로 본다 | 일간 `side-24h` · 주간 `heatmap` |
| **B. 학교 시간표파** | 종이 학교 시간표에 익숙, 교시×요일 격자 선호 | 일간 `stack-chip` · 주간 `school-grid` |
| **C. 미니멀 분석파** | 산만 회피, 그래프로 총량만 본다 | 일간 `none` · 주간 `bar-week` |
| **D. 풀림 default** | 풀림이 권하는 학습 분포 시각화 | 일간 `side-24h` · 주간 `matrix-by-type` |

상황 예시:
- 학기 중 시간표 = 학교형 격자(B), 방학 자습 플래너 = 사이드 24h(A) → 두 플래너에 각각 다른 레이아웃 저장.
- 시험 일주일 전 새 플래너 만들 때 막대 차트만 보고 싶음(C) → 새 플래너 layout만 `bar-week`로.

## 4. 옵션 후보

기준: 공스타그램 50장 분석 + 풀림 기존 컴포넌트 재활용도. 신규 구현은 phase 3에서 별도 plan으로.

### 4.1 일간 레이아웃 (Day Layout)

| 코드 | 이름 | 기반 컴포넌트 | 설명 | 공스타그램 표본 | 신규 구현 |
|---|---|---|---|---|---|
| `side-24h` *(default)* | 사이드 24h 트래커 | `SideTimeline24` (존재) | 좌 시간 라벨 + 우 30분 단위 셀. 학습 점유를 막대로 시각화. | 11 / 50 (압도적) | 0 |
| `stack-chip` | 시간 칩 스택 | `TodayTimeline` 확장 | 가로/세로 칩 스택. 오늘의 흐름을 칩 시퀀스로. 모바일 친화. | 부분 (38 카드 결) | 소 |
| `color-block` | 1시간 컬러블록 | 신규 | 1시간 단위 컬러블록 행 × 1열. 행동별 색깔(공부·식사·휴식). | 28 (월~수 컬러 블록) | 중 |
| `none` | 시간표 숨김 | — | 시간표 영역 자체를 hide. BlockCard 리스트만. | — (산만 회피 응용) | 0 |

### 4.2 주간 레이아웃 (Week Layout)

| 코드 | 이름 | 기반 컴포넌트 | 설명 | 공스타그램 표본 | 신규 구현 |
|---|---|---|---|---|---|
| `matrix-by-type` *(default)* | 타입×요일 매트릭스 | `WeekGrid` (존재) | 풀림 고유. 행=블록 타입, 열=요일, 셀=학습 시간 막대. 학습 분포 분석에 강점. | 풀림 고유 | 0 |
| `school-grid` | 학교형 교시×요일 | 신규 | 행=1교시~N교시, 열=월~금(또는 일), 셀=과목명·교실 코드. 학생 친숙도 1위. | 18 / 50 (압도적) | 중 |
| `bar-week` | 요일별 막대 차트 | `WeeklyChart` (존재) | 7일 × 총 학습 시간 막대. 양의 비교에 집중, 미니멀. | — | 0 |
| `heatmap` | 시간×요일 히트맵 | `MonthHeatmap` 응용 | 행=시간대(2시간 단위), 열=요일, 셀=학습 강도 색칠. 언제 얼마나를 한눈에. | 일부 | 소 |

### 4.3 옵션 카드 미리보기 정책
- 옵션 카드 내 미니어처는 mock 데이터로 inline SVG 또는 mini DOM. 외부 이미지 asset 금지.
- 카드 크기: 데스크탑 16:10, 모바일 풀폭. 카드 안에 미니어처 + 라벨 + 한 줄 설명.
- 선택 상태 토큰: `border-pullim-blue-500 ring-1 ring-pullim-blue-300` (`08-design-system` 카드 selected 패턴 따름).

## 5. 사용자 경험 흐름

### 5.1 진입점 비교

| 안 | 위치 | 장점 | 단점 |
|---|---|---|---|
| **A** | `/planner/manage` 카드 메뉴 → "레이아웃 변경" 모달 | 빠른 변경 | 미리보기 공간 부족 |
| **B (권장)** | `/planner/manage/[id]/edit` 빌더 안 "레이아웃" 탭 | 풀 페이지 미리보기, 다른 빌더 설정과 일관 | 한 번 더 클릭 |
| **C** | `/me/settings/planner-layout` 전역 설정 | 단순 IA | 플래너별 다른 레이아웃 못 줌 |

→ **B 권장**. 이유:
- Planner 타입 안에 `layout` 필드를 두면 플래너별 저장이 자연스러움 (시즌·시험별 다른 레이아웃 욕구 충족).
- 빌더는 이미 시간 범위·과목·집중 패턴 등 시간표 설정을 다루는 도구. 레이아웃도 시간표 설정의 일부로 동거가 자연스러움.
- 모달보다 풀 페이지가 4+4 미리보기 + 인라인 라이브 미리보기에 충분.

보조 entry:
- `/planner` 일간/주간 뷰 우상단 메뉴(`MoreVertical`)에 "이 레이아웃 변경" → 빌더 레이아웃 탭으로 점프(쿼리 `?tab=layout`).
- `/planner/manage` PlannerCard 드롭다운(현재 `복제`·`아카이브`·`삭제` 옆에) "레이아웃 변경" 추가 → 빌더 점프.

### 5.2 빌더 레이아웃 탭 화면

```
┌──────────────────────────────────────────────────────────┐
│  PageHeader — "시간표 빌더" / 플래너 이름                  │
├──────────────────────────────────────────────────────────┤
│  Tabs: [기본 정보] [학습 시간] [과목] [집중 패턴] ▸레이아웃◂│
├──────────────────────────────────────────────────────────┤
│                                                          │
│  § 일간 레이아웃                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│  │ 사이드│ │시간칩 │ │컬러블 │ │ 숨김 │  ← 라디오 카드     │
│  │ 24h  │ │ 스택  │ │ 록  │ │      │                    │
│  └──────┘ └──────┘ └──────┘ └──────┘                    │
│                                                          │
│  § 주간 레이아웃                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│  │매트릭│ │ 학교형│ │막대  │ │히트맵│                    │
│  │ 스   │ │ 격자 │ │차트  │ │     │                    │
│  └──────┘ └──────┘ └──────┘ └──────┘                    │
│                                                          │
│  § 미리보기                                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  현재 선택: 일간 사이드 24h · 주간 매트릭스        │   │
│  │  [실제 컴포넌트로 mock 데이터 렌더]                │   │
│  └──────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│  Footer: [취소]  [저장]                                  │
└──────────────────────────────────────────────────────────┘
```

### 5.3 인터랙션 단계

1. 사용자가 옵션 카드 클릭 → 라디오 selected 변경 (`onChange` local state).
2. 미리보기 패널이 즉시 새 컴포넌트로 갈아탐 — local state 기반 inline 렌더.
3. 사용자가 다른 탭으로 가도 local state 유지(빌더 폼 자체가 form state 보유).
4. footer "저장" 클릭 → 빌더의 다른 필드와 일괄 mock state mutation → toast `✓ 시간표가 저장됐어요` (기존 빌더 카피와 동일 톤).
5. `/planner` 진입 시 활성 플래너의 `layout` 필드를 읽어 분기 렌더.

### 5.4 보조 entry 클릭 흐름
- `/planner` 우상단 메뉴 "이 레이아웃 변경" 클릭 → `router.push('/planner/manage/[activeId]/edit?tab=layout')`.
- 빌더 진입 시 `?tab=layout`이 있으면 탭을 layout으로 초기화.

## 6. 데이터 모델

### 6.1 타입 확장 (`src/lib/mock/planner.ts`)

```ts
export type DayLayoutCode = 'side-24h' | 'stack-chip' | 'color-block' | 'none';
export type WeekLayoutCode = 'matrix-by-type' | 'school-grid' | 'bar-week' | 'heatmap';

export type TimetableLayout = {
  day: DayLayoutCode;
  week: WeekLayoutCode;
};

// Planner에 추가
export type Planner = {
  // ... 기존 필드
  layout: TimetableLayout;
};
```

### 6.2 기본값

```ts
const DEFAULT_LAYOUT: TimetableLayout = {
  day: 'side-24h',
  week: 'matrix-by-type',
};
```

- 새 플래너 생성 시 `layout = DEFAULT_LAYOUT`.
- 기존 mock seed 플래너 전부 `layout = DEFAULT_LAYOUT` backfill.

### 6.3 mutation API

```ts
export function updatePlannerLayout(id: string, layout: TimetableLayout): Planner { /* ... */ }
```

- in-memory mutation, 다른 planner CRUD API와 일관(`activatePlanner` 등).
- 데모 hook: `window.__pullim.updatePlannerLayout(activeId, { day, week })` 노출(`subscriptions.ts` 선례).

### 6.4 읽는 위치

| 호출자 | 호출 | 분기 |
|---|---|---|
| `DayView` | `getActivePlanner().layout.day` | `side-24h` / `stack-chip` / `color-block` / `none` 컴포넌트 선택 |
| `WeekView` | `getActivePlanner().layout.week` | `matrix-by-type` / `school-grid` / `bar-week` / `heatmap` |
| `MonthView` | — (본 spec 범위 외) | — |

### 6.5 향후 백엔드
- `user_planner.layout JSONB`로 매핑 가능. 본 spec은 mock만.

## 7. 비즈니스 규칙 · 검증

### 7.1 규칙
- 한 플래너에 day·week 각 1개씩 layout 저장.
- layout 변경은 저장 즉시 적용(SSR 새 진입부터 반영).
- archived 플래너의 layout도 변경 가능 — 회고 시 다른 시각으로 보고 싶을 수 있음.
- 새 옵션 코드를 enum에 추가할 때는 default fallback을 강제해 backward-compatible 유지.

### 7.2 권한 (RBAC 정합)
- 학생: 자기 플래너 layout 변경 가능.
- 부모: 자녀 플래너 보기만(현재 부모 권한 정책 그대로). layout 변경 불가.
- 선생: 클래스봇 시간표에는 본 layout 무관. 별도 IA.

### 7.3 검증
- 저장 직전 `layout.day in DayLayoutCode` & `layout.week in WeekLayoutCode` 검사. 위반 시 default fallback + 콘솔 warn.
- 빌더 폼 자체에는 enum 라디오라 자유 입력 없음. 검증은 mock mutation 함수에서 방어.

### 7.4 라이브 회귀 방지
- Phase 1에서 seed 플래너 전부 default. /planner 라이브 동작 0 변경.
- Phase 2에서도 새 옵션 컴포넌트가 stub일 동안은 default 외 옵션 선택 시 빌더에서 "곧 열려요" 라벨 + 라디오 비활성.

## 8. 콘텐츠 · 마이크로카피

### 8.1 옵션 카드 카피

**일간**
| 코드 | 라벨 | 한 줄 설명 |
|---|---|---|
| `side-24h` | 24시간 한 줄 | 30분 단위 칸으로 오늘 시간 점유를 한눈에 |
| `stack-chip` | 시간 칩으로 | 블록을 칩으로 줄세워 흐름만 따라가요 |
| `color-block` | 1시간 색깔 블록 | 한 시간씩 색깔 블록으로 하루 색으로 구분 |
| `none` | 시간표 없이 | 시간 칸 숨기고 블록 카드만 봐요 |

**주간**
| 코드 | 라벨 | 한 줄 설명 |
|---|---|---|
| `matrix-by-type` | 학습 분포 격자 | 어떤 종류 학습을 어느 요일에 했는지 |
| `school-grid` | 학교 시간표 | 교시 × 요일 격자에 과목명 |
| `bar-week` | 요일 막대 차트 | 요일별 총 학습 시간만 막대로 |
| `heatmap` | 시간대 색칠 | 언제 얼마나 했는지 시간대 × 요일 색으로 |

### 8.2 토스트 · 시스템 카피

| 트리거 | 카피 | duration |
|---|---|---|
| 저장 성공 (빌더 footer "저장") | `✓ 시간표가 저장됐어요` + `이번 시간표는 {dayLabel} · {weekLabel}로 보여요` | 3000 |
| 보조 entry "이 레이아웃 변경" | `→ 빌더에서 미리보기로 골라봐요` (route 이동 직전) | 1500 |
| 미구현 옵션 클릭 (phase 2) | `🛠️ 곧 열려요` + `{라벨} 레이아웃은 곧 풀려요. 지금은 기본 형식을 써주세요.` | 3000 |

### 8.3 한자어 정책
- "활성"·"비활성" → "쓰는 중"·"잠시 보관" (07-branding § 6 일관).
- "선택"·"적용"은 그대로 두되 "저장" 톤이 더 가벼움.
- 옵션 이름은 모두 짧고 일반어로. "매트릭스" 같은 단어는 라벨에서는 "격자"로 풀어쓰기.
- "레이아웃"·"히트맵"·"막대 차트"는 자리 잡은 외래어. 그대로.

## 9. 디자인 시스템 연계 (`08-design-system`)

| 요소 | 토큰 / 패턴 |
|---|---|
| 옵션 카드 컨테이너 | `bg-card rounded-2xl border p-4` |
| 옵션 카드 selected | `border-pullim-blue-500 ring-1 ring-pullim-blue-300` |
| 옵션 카드 hover | `hover:border-pullim-blue-200` |
| 미니어처 영역 | 카드 상단, aspect-ratio 16:10, 안쪽 inline SVG/DOM |
| 미리보기 패널 | `bg-card rounded-2xl border p-5` (day-view 시계 카드 패턴 답습) |
| Tab 스타일 | 빌더 기존 탭 컨벤션 그대로 |
| Footer 버튼 | 빌더 기존 footer 그대로 (`bg-pullim-blue-600` 저장 + ghost 취소) |
| 카드 카피 라벨 폰트 | `text-sm font-bold` |
| 한 줄 설명 폰트 | `text-pullim-slate-500 text-[11px]` |

## 10. 단계별 로드맵

### Phase 1 — 데이터 모델 + 분기 골격 (라이브 변화 0)
- `Planner` 타입에 `layout` 필드 추가.
- mock seed 전부 default backfill.
- `DayView` / `WeekView`가 `getActivePlanner().layout`을 읽어 분기 — 현재는 default 분기만 채우고 나머지는 stub.
- 데모 hook 노출.
- **검증**: tsc 통과, `/planner` 일간/주간 라이브 영향 0.

### Phase 2 — 빌더 레이아웃 탭 (UI only, 신규 컴포넌트 stub)
- `/planner/manage/[id]/edit`에 레이아웃 탭 추가.
- 4+4 옵션 카드 + 미리보기 패널 (default 옵션은 실제 컴포넌트, 나머지는 stub 카드 "곧 열려요").
- 저장 → mock mutation + toast.
- 보조 entry 추가(일간/주간 뷰 우상단 메뉴, PlannerCard 드롭다운, `?tab=layout` 점프).
- **검증**: 라이브에서 default 외 옵션 선택 시 stub 안내, default 선택 시 미리보기 정상.

### Phase 3 — 신규 컴포넌트 본구현
신규 컴포넌트 4종을 각각 별도 plan으로:
- `stack-chip` 일간 (TodayTimeline 확장, 세로 스택 버전)
- `color-block` 일간 신규 (1시간 컬러블록 행)
- `school-grid` 주간 신규 (교시×요일 격자)
- `heatmap` 주간 (MonthHeatmap 응용, 30분 셀)
- 각 plan마다 옵션 카드 미니어처 + 본 컴포넌트 + 모바일/데스크탑 정합 확인.

### Phase 4 — 정착 (선택)
- Phase 2의 보조 entry UX 다듬기, 토스트 카피 다듬기.
- SSOT 통합: `/update-spec`으로 03·04·05·06·08에 본 spec 내용 흡수.
- 본 단일 파일은 history로 archive 이동.

## 11. Out of Scope (별도 spec/plan)

- 셀 색칠 인터랙션 (학습 시간을 직접 셀에 칠하기) — 공스타그램 시사점 2.
- 과목 컬러 토큰 본구현 (테마 스킨 시스템) — 공스타그램 시사점 3, 5.
- 헤더 위젯 (D-day, Total time 누적, Day n/66, 영문 한 줄 슬로건) — 공스타그램 시사점 4.
- 인스타 공유 카드 export (Wake-up / Meals / Exercise / Focus 4분할) — 공스타그램 시사점 6.
- 만다라트 9×9 큰 목표 페이지 / 30일 챌린지 트래커.
- 백엔드 `user_planner.layout JSONB` 컬럼.
- MonthView 레이아웃 옵션 (필요해지면 별도 spec).
- 클래스봇·라이브러리 도메인의 시간표 / 캘린더 IA — 본 spec과 무관.

## 12. 참고

### 관련 보고서
- 공스타그램 50장 분석: [`proc/research/2026-05-08_gongstagram-timetable-reference/report.md`](../research/2026-05-08_gongstagram-timetable-reference/report.md)

### 관련 archive plan
- [`2026-05-08_planner-vertical-bar-q-toggle.md`](../archive/2026-05-08_planner-vertical-bar-q-toggle.md) — WeekGrid 세로 막대 + Q 구독 게이팅
- [`2026-05-08_planner-multi-1-data-model.md`](../archive/2026-05-08_planner-multi-1-data-model.md) — N개 플래너 모델
- [`2026-05-08_planner-multi-3-manage-page.md`](../archive/2026-05-08_planner-multi-3-manage-page.md) — 시간표 관리 페이지
- [`2026-05-08_planner-multi-4-home-as-timetable.md`](../archive/2026-05-08_planner-multi-4-home-as-timetable.md) — 홈 = 활성 시간표 통합

### 핵심 코드 위치 (2026-05-11 시점)
- `src/lib/mock/planner.ts` — `Planner` 타입, mock seed, CRUD API
- `src/lib/mock/subscriptions.ts` — module singleton + window hook 선례
- `src/components/planner/views/day-view.tsx` — 일간 분기 대상
- `src/components/planner/views/week-view.tsx` — 주간 분기 대상
- `src/components/planner/side-timeline-24.tsx` — 일간 default
- `src/components/planner/week-grid.tsx` — 주간 default
- `src/components/planner/today-timeline.tsx` — `stack-chip` 일간 베이스 후보
- `src/components/planner/weekly-chart.tsx` — `bar-week` 주간 베이스 후보
- `src/components/planner/month-heatmap.tsx` — `heatmap` 주간 베이스 후보
- `src/app/(student)/planner/manage/[id]/edit/` — 빌더 위치(추정, 빌더 path 확정은 Phase 2 plan에서)
