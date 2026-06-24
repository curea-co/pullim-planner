# 2026-06-24 — LNB '루틴'(반복 학습 블록) 풀스택 기능명세

> pullim-planner에 **반복 학습 블록(루틴)을 정의하면 매일 시간표에 자동으로 채워지는** 계층을 얹는 FE+BE 명세.
> **본 문서는 요구사항 정의이며, 코드 변경을 포함하지 않는다.**
> 선행 권위: 플래너 도메인 = [input/docs-archive/08_풀림_플래너_핸드오프.md](../../input/docs-archive/08_풀림_플래너_핸드오프.md) (특히 **UC-3 재수생의 루틴 재건**),
> BE API 설계 = [proc/spec/2026-05-18_be-api-design.md](2026-05-18_be-api-design.md),
> 데이터 클라 = [packages/api-client/src/pullim-planner.ts](../../packages/api-client/src/pullim-planner.ts),
> 블록 엔티티 = [apps/backend/src/entities/time-block.entity.ts](../../apps/backend/src/entities/time-block.entity.ts).

## 결정 요약 (현 시점 권고 — 확정은 §11 오픈이슈에서)

> **핵심 개념 (2026-06-24 재정의)**: 루틴 = **반복하는 행동을 등록해 두는 재사용 라이브러리**. "시간표 관리 → 새 시간표 만들기"에서 활용 → 기존 8단계 위저드가 **9단계**(루틴 단계 = **5번**, 패턴 다음·약점 앞)가 된다. 등록된 루틴을 위저드에서 골라 적용하면 그 시간표의 요일 반복 블록으로 들어간다.

| 항목 | 권고 |
|---|---|
| 루틴의 정체 | **재사용 가능한 "반복 행동" 라이브러리 항목** — 과목·유형·시간대 + 요일 반복. 시간표 생성 시 그 시간표의 반복 블록으로 적용되는 템플릿 |
| 통합 지점 | (1) **LNB `/planner/routine` 라이브러리**(등록·관리) + (2) **새 시간표 만들기 9단계 위저드 5단계**(등록 루틴 적용) |
| 반복 규칙 표현 | **요일 비트마스크**(7비트, 월~일) — 주간 요일 반복만 지원. RRULE은 과설계라 보류 |
| 소유 단위 | **사용자 단위**(`userId`) — 라이브러리는 모든 시간표에 재사용. 적용은 위저드에서 시간표별 선택 (오픈이슈 OI-1, 재정의로 변경) |
| 적용 시점 | **시간표 생성(위저드) 시 적용** — 선택 루틴이 그 시간표 범위의 요일 블록으로 생성. (일일 on-the-fly 합성은 대안, OI-2) |
| 충돌 처리 | **수동 블록 우선** — 같은 시간대 겹치면 루틴 블록은 양보(표시 보류) (오픈이슈 OI-3) |
| 구현 범위(출시) | ⚠️ **FE 화면설계(mock)만** — 실 BE·마이그레이션은 **서비스 오픈 이후로 연기**(사용자 확정 2026-06-24). 이유: 루틴 실 BE는 pullim-api 팀 의존 + 공유 DB 마이그레이션이라 출시일 불가. 자세히는 §12 |
| 산출물 | 본 명세(spec) + **출시: 루틴 FE(mock) 화면**. 실 BE 풀스택은 후속 트랙(설계는 본 문서가 권위로 보존) |

---

## 0. AI 명령지침 (Core Rules)

이 명세를 구현할 AI에게:

1. **깊게 생각하고 스스로 검토하라.** 자기관리가 무너진 학습자(UC-3)를 일과로 다시 세우는 기능이다. "강제"가 아니라 "회복을 돕는 비계(scaffold)"로 설계하라.
2. **신규 코드를 최소화하라.** 루틴 블록은 기존 `TimeBlock` 구조(§5 ERD)를 그대로 재사용해 생성한다. 새 블록 타입/색/레이아웃을 만들지 말고 기존 `BlockType`·palette·블록 색문법을 쓴다.
3. **FE/BE를 한 PR에 섞지 마라** (리포 최상위 룰). 순서: `packages/types`(공유 타입) → `packages/api-client`(routine CRUD) → `apps/backend`(BE) → `apps/planner`(FE). 공유 타입 PR이 항상 선행.
4. **Container/Presenter 컨벤션** 준수 — 로직 보유 화면은 `apps/planner/components/features/planner-routine/{containers,presenters,components,hooks}/`.
5. **BE 클린아키텍처** 준수 — `controller / use-cases / service / interface / infrastructure`. 스키마는 **마이그레이션 소유**(`synchronize=false`), 엔티티는 매핑만.
6. **배포 정책** — main→prod 자동배포가 켜져 있고 prod env가 비어있다. 루틴 계층은 **dev에서만 검증**하고 prod 노출은 엔타이틀먼트/플래그 게이트 뒤에 둔다.
7. **i18n 미도입** — 한국어 하드카피 허용. **shadcn/ui + Base UI** 프리미티브만 사용(`@pullim/design-system` 금지).
8. **온보딩/락 해제** — 현재 `nav-config.ts`의 루틴 항목은 `locked: true`. 구현 완료 PR에서 `locked` 제거 + `description` 갱신.

---

## 1. 제품 정의 (Product Definition)

### Problem Statement
학습자는 매일 비슷한 학습 블록(예: "아침 영단어 30분", "저녁 수학 인강 50분")을 **반복해서 손으로 다시 짠다.** 특히 **선생님·동료가 없는 독학 재수생(UC-3)**은 외부 구조가 사라지면 자기관리가 붕괴되고(하루 중단율 38%), 매일 "오늘 뭐부터 하지"의 인지 비용에 무너진다. 시간표를 매일 새로 짜는 마찰이 학습 지속을 깬다.

### Product Goal
**한 번 정의한 반복 블록(루틴)이 매일 시간표를 자동으로 채워**, 학습자가 "계획"이 아니라 "실행"에서 하루를 시작하게 한다. 일과의 뼈대를 시스템이 유지해 **자기관리 비계**를 제공하고, 빈 슬롯·회복 시간만 사용자가 조정하게 한다. UC-3 목표: 하루 학습 중단율 38%→12%.

### Persona
- **주 사용자 — 독학 재수생/N수생(UC-3, 박민지).** 선생님·동료 부재. "오늘 뭐부터"의 결정 피로가 큼. 매일 같은 골격(아침 암기 → 오전 개념 → 오후 문제 → 저녁 복습)을 반복하고 싶다.
- **부 사용자 — 고3 수험생(UC-1).** 코어 루틴(저녁 4블록)을 고정하고 D-day 가중 블록만 그날그날 얹는다.
- **(비대상) 튜터·학부모.** 루틴은 학습자 본인 일과 관리 도구 — 공유/배정 대상 아님(스터디그램·공유 리포트와 분리).

---

## 2. 핵심 기능 정의 (MoSCoW / IA / Screen Spec)

### 2.1 MoSCoW

| 등급 | 기능 |
|---|---|
| **Must** | 루틴 CRUD(생성·목록·수정·삭제) / 요일 반복 규칙(월~일 다중 선택) / 시간대·과목·유형 지정 / 활성 시간표의 그날 블록에 자동 반영(materialize) / 루틴 ON·OFF 토글 |
| **Should** | 반복 종료조건(무기한 / 종료일 / 시험일까지) / 시간표 자동반영 미리보기 / 충돌(겹침) 시각 표시 / 루틴 출처 배지("루틴" 칩) |
| **Could** | 루틴 템플릿 추천(과목·페르소나 기반) / 루틴 일괄 적용(요일 묶음) / 특정 날짜만 루틴 건너뛰기(skip exception) / 교육학 엔진 자동 태깅 |
| **Won't(이번 범위)** | 월간/격주/N일마다 등 복합 RRULE / 루틴 공유·타인 배정 / 루틴 간 우선순위 자동 최적화 / 외부 캘린더 동기화 |

### 2.2 Sitemap / IA

```
/planner (홈, 시간표)
└─ LNB: 홈 · 관리 · 리포트 · 공유 · [루틴] · 소개
   ├─ /planner/routine                 # 루틴 라이브러리 (반복 행동 목록, 사용자 단위)
   │  ├─ /planner/routine/new          # 루틴 생성 (폼)
   │  └─ /planner/routine/[routineId]  # 루틴 상세·편집
   └─ /planner/manage/new              # 새 시간표 만들기 — 8단계 → 9단계 (5단계=루틴 적용)
```
- 루틴 라이브러리는 **사용자 단위**(모든 시간표에 재사용). 헤더의 활성 시간표와 무관하게 내 루틴 전체를 본다.
- 위저드 5단계에서 **등록된 루틴을 골라 이 시간표에 적용** → 생성 미리보기(8→이제 9단계)에 반복 블록으로 반영.

### 2.3 Screen Spec

#### S-1 `/planner/routine` — 루틴 라이브러리(목록)
| 구성요소 | 설명 |
|---|---|
| 헤더 | "내 루틴" + `+ 루틴 추가` CTA + 안내 "등록한 루틴은 새 시간표 만들 때 골라 쓸 수 있어요" |
| 요일 요약 띠 | 월~일 7칸, 각 요일에 걸린 루틴 개수 도트 |
| 루틴 카드 리스트 | 카드별: 제목 · 과목/유형 색칩 · 시간대 · 반복 요일(월화수…) · 케밥(편집/삭제) |
| 빈 상태 | "아직 루틴이 없어요. 매일 반복하는 행동을 등록하면 새 시간표를 만들 때 바로 불러올 수 있어요." + `루틴 추가` |

#### S-2 `/planner/routine/new`·`/[routineId]` — 생성·편집
| 구성요소 | 설명 |
|---|---|
| 제목 입력 | 예: "아침 영단어" (필수, 1~40자) |
| 과목 선택 | 과목 키 드롭다운(시간표 무관 — 라이브러리이므로 공통 과목 셋) |
| 유형 선택 | `BlockType` 7종(개념/문제/복습/암기/모의/질문/셀프설명) — 기존 색칩 |
| 시간대 | 시작–종료(또는 시작+소요분). 15분 단위 |
| 반복 요일 | 월~일 7개 토글칩(다중 선택, 최소 1개) |
| 저장/삭제 | 저장(청유형 CTA "루틴 저장하기") / 편집 시 삭제 |

#### S-3 새 시간표 만들기 — **9단계 위저드 5단계 "루틴"** (핵심 신규)
> 기존 8단계([planner-wizard.tsx](../../apps/planner/components/features/planner-manage/components/planner-wizard.tsx))에 5단계 삽입. 1목표·2시간·3범위·4패턴·**[5루틴]**·6약점·7동기·8알림·9미리보기·활성화.

| 구성요소 | 설명 |
|---|---|
| 단계 헤더 | "루틴 — 반복하는 행동" · "매일/매주 반복할 행동을 골라 이 시간표에 넣어요" |
| 라이브러리 선택 | 등록된 루틴 카드 멀티선택(체크). 선택 시 이 시간표에 적용 |
| 인라인 추가 | "+ 새 루틴" — 위저드 안에서 바로 등록(라이브러리에도 저장) |
| 종료 범위(시간표별) | 적용 루틴마다 `무기한` / `시험일까지`(이 시간표 examEndDate). 라이브러리 항목 자체가 아니라 **적용 시점에 시간표별로** 결정 |
| 미리보기 연결 | 선택 결과가 9단계(미리보기·활성화)의 주간 자동생성에 반영 |
| 스킵 가능 | 루틴 0개여도 다음 진행(선택 단계) |

#### S-4 홈 day-view 출처 배지(기존 화면 확장, Should)
| 구성요소 | 설명 |
|---|---|
| 루틴 배지 | 루틴 적용으로 생성된 블록 우상단 작은 "루틴" 칩(slate 톤, 얇은 액센트) |
| 충돌 표시 | 수동 블록과 겹치면 루틴 블록은 양보 + "겹쳐 보류" 안내 |

---

## 3. 사용자 경험 설계 (UX Flow / RBAC)

### 3.1 핵심 플로우 — 루틴 등록 → 새 시간표에 적용 (UC-3)
```
[등록] LNB '루틴' → /planner/routine → '루틴 추가'
  → "저녁 수학 인강" · 수학 · 개념 · 19:00~19:50 · 요일[월·화·수·목·금] → '루틴 저장하기'
  → 라이브러리에 카드 1개

[적용] 관리 → '새 시간표 만들기'(9단계 위저드)
  → 1목표 … 4패턴 → [5 루틴] 등록 루틴 멀티선택("저녁 수학 인강" 체크) + 종료=시험일까지
  → 6약점 … 8알림 → 9 미리보기: 평일 19:00에 루틴 블록 포함된 주간 자동생성 확인 → 활성화
  → 홈 day-view: 평일이면 19:00 블록이 "루틴" 배지와 함께 표시
```

### 3.2 Navigation Flow
```
홈/LNB ──▶ /planner/routine ──▶ /new ──▶ (저장) ──▶ /planner/routine
                  │                        │
                  └──▶ /[routineId] ◀──────┘ (카드 클릭=편집)
홈 day-view ◀── 자동 materialize (조회 시) ── 루틴(활성 플래너, 해당 요일)
```

### 3.3 RBAC
| 역할 | 루틴 조회 | 생성/수정/삭제 | 비고 |
|---|---|---|---|
| 학습자(본인) | 본인 플래너 루틴만 | O | 전역 `JwtAuthGuard` + 소유권(`req.user.id`) 검사 |
| 타인 | 불가(403) | 불가 | 루틴은 공유 대상 아님 |
| 비로그인 | 불가(401) | 불가 | |

---

## 4. 운영 로직 및 비즈니스 정책 (Business Rules / Validation / ERD)

> ⚠️ **개념 재정의(2026-06-24) 반영 필요** — 아래 §4.1~§4.4·§5 ERD/규칙은 초안의 "**플래너 종속 + 매일 on-the-fly 합성**" 모델로 서술돼 있다. 확정 개념은 **사용자 단위 라이브러리 + 새 시간표 만들기 위저드에서 적용(생성 시 bake)**이다(§0·§11 OI-1/OI-2). 실 BE(연기 트랙) 착수 시 다음으로 갱신: `routines.userId` FK, 시간표↔루틴 N:M 적용 링크(또는 생성 시 블록 bake), `weekdayMask`·`recurrenceEnd`는 **적용 시점(시간표별)** 결정. 아래는 초안 보존(대안 모델로 참고).

### 4.1 핵심 비즈니스 규칙
1. **루틴 = 청사진, 블록 = 인스턴스.** 루틴은 `TimeBlock`을 *생성하는 규칙*이며 그 자체가 블록은 아니다.
2. **materialize(권고: 조회 시 on-the-fly)** — `GET /planners/:id/blocks?date=D` 응답 시, 그 플래너의 활성 루틴 중 **요일(D의 dow)이 매칭 + 종료조건 내 + 그날 skip 아님**인 루틴을 가상 `TimeBlock`(id=`routine:{routineId}:{date}`, status=`todo`, progress=0)으로 합성해 수동 블록과 합쳐 반환한다. **DB에 TimeBlock을 저장하지 않는다.**
3. **충돌(겹침)** — 합성 루틴 블록이 같은 플래너·같은 날 **수동 블록과 시간 겹침**이면 **수동 블록 우선**, 루틴 블록은 응답에서 제외(또는 `suppressed=true` 플래그). 사용자에겐 "겹쳐 보류됨" 안내.
4. **완료 상태의 처리** — 합성 블록은 매일 새로 생성되므로 완료 기록(`block_completions`)은 `(routineId, date)` 키로 별도 관리하거나, materialize된 블록을 사용자가 완료할 때 비로소 실체 `TimeBlock`으로 승격(promote)한다 → **OI-2와 연계 결정**.
5. **활성 플래너 종속** — 루틴은 `plannerId`에 묶이며, 비활성/아카이브 플래너의 루틴은 materialize 대상 아님.
6. **ON/OFF** — `enabled=false` 루틴은 materialize 제외(삭제 없이 일시 중지).

### 4.2 ERD (신규 Routine + 기존 TimeBlock 관계)

```
Planner (기존) 1 ──< Routine (신규) >── materialize ──> TimeBlock (기존, 합성/승격)
```

**`routines` 테이블 (신규, 마이그레이션 소유)**
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | text PK | `routine_...` |
| plannerId | text FK→planners CASCADE | 소유 플래너 (OI-1: vs userId) |
| title | text | 루틴 제목 |
| subject | text | 과목 키 |
| type | text | `BlockType` (기존 enum 문자열) |
| startTime | time | "HH:MM" |
| endTime | time | "HH:MM" |
| expectedMinutes | int | 소요(파생 가능하나 명시 저장) |
| weekdayMask | smallint | **요일 비트마스크** (bit0=월 … bit6=일). 예: 평일=0b0011111 |
| linkedFeatureSlug | text nullable | 기존 블록과 동일 |
| engines | text[] default '{}' | 교육학 엔진 태그(기존과 동일) |
| recurrenceEnd | text nullable | `null`(무기한) / ISO date / `'exam'`(examEndDate) |
| enabled | boolean default true | ON/OFF |
| createdAt / updatedAt | timestamptz | |

**`routine_skips` 테이블 (Could, skip exception)**
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | text PK | |
| routineId | text FK→routines CASCADE | |
| date | date | 이 날짜만 건너뜀 |

> **반복 규칙 표현**: 요일 비트마스크 채택(7비트). 주간 요일 반복만 필요하므로 RRULE(iCalendar)은 과설계. 추후 격주/월간이 필요하면 `recurrenceRule text`(RRULE) 컬럼으로 확장하되 본 범위는 비트마스크 고정.

### 4.3 API (BE, `/planners/:id/routines` 하위)
| 메서드·경로 | 설명 | 비고 |
|---|---|---|
| `GET /planners/:id/routines` | 플래너 루틴 목록 | 소유권 검사 |
| `POST /planners/:id/routines` | 루틴 생성 | validation §4.4 |
| `PATCH /planners/:id/routines/:routineId` | 수정(부분) | |
| `DELETE /planners/:id/routines/:routineId` | 삭제 | |
| `PATCH …/:routineId` (`enabled`) | ON/OFF 토글 | PATCH로 통합 |
| `POST …/:routineId/skips` (Could) | 특정 날짜 건너뛰기 | |
| `GET /planners/:id/blocks?date=` (기존, 확장) | 응답에 루틴 합성 블록 포함 | materialize 로직 추가 |

### 4.4 Validation Rules
| 필드 | 규칙 |
|---|---|
| title | 필수, 1~40자, trim |
| subject | 활성 플래너 `subjectUnits` 키 중 하나 |
| type | `BlockType` 7종 중 하나 |
| startTime/endTime | "HH:MM", 15분 단위, start < end, 동일일 내 |
| weekdayMask | 1~127(최소 1개 요일) |
| recurrenceEnd | null 또는 미래 ISO date 또는 `'exam'` |
| 시간 겹침(같은 루틴셋) | 동일 요일·동일 시간대 루틴 중복 생성 차단(경고) |

---

## 5. 콘텐츠 데이터셋 (Seed Data / Mock)

FE mock은 [apps/planner/lib/mock/planner.ts](../../apps/planner/lib/mock/planner.ts)의 `TimeBlock`·`planner`·`blockTypeMeta` 구조를 재사용한다. 신규 `mockRoutines: Routine[]` 추가 예시(활성 플래너 `pl_001` 기준):

```
[
  { id:'routine_001', title:'아침 영단어', subject:'english', type:'memorize',
    startTime:'07:30', endTime:'08:00', expectedMinutes:30,
    weekdayMask:0b0111111 /*월~토*/, recurrenceEnd:'exam', enabled:true },
  { id:'routine_002', title:'저녁 수학 인강', subject:'math', type:'concept',
    startTime:'19:00', endTime:'19:50', expectedMinutes:50,
    weekdayMask:0b0011111 /*월~금*/, recurrenceEnd:null, enabled:true },
  { id:'routine_003', title:'주말 모의고사', subject:'math', type:'mock',
    startTime:'10:00', endTime:'11:40', expectedMinutes:100,
    weekdayMask:0b1000000 /*일*/, recurrenceEnd:null, enabled:false /*OFF 예시*/ },
]
```
- materialize 데모: 오늘(데모 기준일 2026-04-24 금)에는 `routine_001`(토 포함이나 금 매칭)·`routine_002`(금 매칭)가 합성, `routine_003`(일·OFF)은 제외.
- 빈 상태/충돌 데모용 케이스도 mock으로 1건씩 준비.

---

## 6. 브랜딩 / 마이크로카피 (Tone & Voice)

핸드오프 §6 마이크로카피 4원칙(명령형→청유형 / 평가어→관찰어 / 위협→권유 / 이모지 절제) 준수.

| 상황 | 카피 |
|---|---|
| 빈 상태 | "아직 루틴이 없어요. 매일 반복하는 블록을 등록하면 시간표가 자동으로 채워져요." |
| 저장 CTA | "루틴 저장하기" |
| 저장 완료 토스트 | "루틴을 저장했어요 — 해당 요일마다 자동으로 들어가요" |
| ON/OFF | ON "매일 적용 중" / OFF "잠시 멈춤" |
| 충돌 안내 | "오늘은 ○○와 시간이 겹쳐 보류됐어요" (위협 아님, 관찰) |
| 종료조건 | "시험일까지" / "○월 ○일까지" / "계속 반복" |
| 삭제 확인 | "이 루틴을 삭제할까요? 이미 지난 기록은 그대로 남아요." |

루틴 출처 배지 라벨: `루틴` (slate 톤, 얇은 칩).

---

## 7. 디자인 시스템 (재사용)

- **색**: 기존 `blockTypeMeta` 색칩 + palette 그대로. 루틴 전용 색을 새로 만들지 않는다. 루틴 배지는 `bg-pullim-slate-100 text-pullim-slate-600`(얇은 액센트, 큰 fill 금지 — color-palette 가드).
- **블록 색문법**: 자동 채워진 루틴 블록도 기존 상태 색문법(대기=무톤+border / 진행 / 완료 / 이월)을 그대로 따른다. "루틴 출처"는 배지로만 구분.
- **요일 토글칩**: shadcn 토글/버튼 기반 7칩, 선택 시 `bg-pullim-blue-600 text-white`.
- **타이포·라운드·모션**: 기존 토큰(`globals.css @theme`) 사용. 신규 토큰 없음.
- **레이아웃**: 루틴 카드 = day-view 블록 카드와 동일 리듬(좌측 타입색 stripe 재사용 가능).

---

## 8. 기술 환경 / 배포 정책

| 레이어 | 스택·규칙 |
|---|---|
| 공유 타입 | `packages/types` — `Routine`, `RoutineWrite`, `WeekdayMask` 등. **선행 PR** |
| API 클라이언트 | `packages/api-client/src/pullim-planner.ts` — `getRoutines/createRoutine/updateRoutine/deleteRoutine`. cookie-http 재사용 |
| BE | NestJS11 클린아키텍처. 신규 `routines` 모듈(또는 planner 모듈 내 controller 추가) + Routine 엔티티 + **마이그레이션**(synchronize=false) + materialize use-case 확장 |
| FE | Next.js16 App Router, `features/planner-routine/{containers,presenters,components,hooks}`, shadcn/ui, 한국어 하드카피 |
| 배포 | dev 검증 전용. prod 노출은 엔타이틀먼트/플래그 게이트 뒤 (흡수 핸드오프 §3) |
| 테스트 | BE: use-case·materialize 단위 테스트(요일 매칭·종료조건·충돌). FE: Jest+RTL(폼 검증·목록·미리보기) |

---

## 9. 단계적 개발 로드맵 (PR 시퀀스 — 각 단독 검증)

> 리포 최상위 룰: FE/BE를 한 PR에 섞지 않는다. 공유 타입이 항상 선행.
> ⚠️ **출시(06-29) 범위 = R4·R5(FE, mock)만.** R0·R1·R2·R3(실 BE·api-client 연동)은 **서비스 오픈 이후 연기**(§12).

| Phase | 출시 | PR | 범위 | 검증 |
|---|---|---|---|---|
| **R4** | ✅ 출시 | `apps/planner` (1) | LNB 락 해제 + **`/planner/routine` 라이브러리**(목록·생성·편집·삭제, **mock** `mockRoutines`) | typecheck/lint/test, 화면 회귀 |
| **R5** | ✅ 출시 | `apps/planner` (2) | **새 시간표 만들기 위저드 8→9단계**(5단계=루틴 적용, 라이브러리 멀티선택+인라인추가) + 9단계 미리보기 반영 (mock) | e2e: 등록→위저드 적용→미리보기 |
| **R5b**(Should) | ◐ 출시여유 | `apps/planner` (3) | 홈 day-view 루틴 출처 배지·충돌 표시 (mock) | 화면 회귀 |
| **R0** | ⏸ 연기 | `packages/types`(또는 api-client) | `Routine`·`RoutineWrite`·`WeekdayMask` 타입 + 비트마스크 헬퍼 | typecheck, 단위테스트 |
| **R1** | ⏸ 연기 | **pullim-api**(플랫폼) | Routine 엔티티 + 마이그레이션 + 루틴 CRUD | 게이트키퍼 핸드오프 |
| **R2** | ⏸ 연기 | **pullim-api**(플랫폼) | `GET blocks` materialize 확장(요일·종료·충돌) | materialize 단위테스트 |
| **R3** | ⏸ 연기 | `packages/api-client` | routine CRUD 클라이언트 + FE 실연동 | 계약 테스트 |
| **R6**(Could) | ⏸ 연기 | FE/BE | skip exception / 템플릿 추천 | — |

> R1·R2(실 BE)는 이 repo `apps/backend`가 아니라 **pullim-api(플랫폼, 게이트키퍼 소유)**에 들어간다 — FE가 라이브로 무는 곳. 본 repo `apps/backend`는 참조 구현. 연기 트랙은 cutover와 동일하게 **pullim-api 요구사항 핸드오프**로 시작.

**완료 기준 체크리스트**
- [ ] 루틴 CRUD 동작(목록·생성·수정·삭제·ON/OFF)
- [ ] 활성 플래너·해당 요일에 그날 블록 자동 합성, "루틴" 배지 표시
- [ ] 종료조건(무기한/종료일/시험일까지) 정확
- [ ] 수동 블록과 충돌 시 보류 + 안내
- [ ] `nav-config.ts` 루틴 `locked` 제거 + description 갱신
- [ ] FE/BE PR 분리, 각 단독 typecheck/lint/test 통과

---

## 10. 재사용 자산 매핑 (신규 코드 최소화)

| 필요 | 재사용 대상 |
|---|---|
| 블록 데이터 구조 | `TimeBlock`(entity·mock) — 루틴 합성 블록이 그대로 채택 |
| 블록 타입·색 | `blockTypeMeta`·`palettes`·블록 색문법 |
| 과목·단원 | 활성 플래너 `subjectUnits` |
| CRUD 패턴 | planner CRUD(controller/use-case/repo, pullim-planner.ts) 그대로 차용 |
| 폼·위저드 | `planner-manage`의 `usePlannerForm`·`PlannerWizard` 패턴 |
| 빈 상태 | `PeriodEmptyState`(planner-home) 유사 패턴 |
| 좌측 타입 stripe | `next-block-hero`의 `TYPE_STRIPE` 맵 |

---

## 11. 오픈 이슈 (구현 전 사용자 결정 필요)

- **OI-1 · 루틴 소유 단위** — ✅ **결정(2026-06-24 재정의): 사용자 단위(`userId`) 라이브러리.** 모든 시간표에 재사용. 시간표에의 적용은 위저드에서 선택(시간표↔루틴 N:M 링크 또는 생성 시 블록 bake — OI-2 연계). *(초기 plannerId 안에서 변경)*
- **OI-2 · 적용/materialize 방식** — 시간표 생성(위저드) 시 선택 루틴을 그 시간표 범위의 요일 블록으로 **생성(bake)** vs 조회 시 on-the-fly 합성. **권고: 위저드 모델에선 생성 시 bake**(미리보기·활성화 단계가 이미 주간 자동생성). 단 라이브러리에서 루틴을 수정해도 기존 시간표엔 소급 안 됨(스냅샷). 실 BE 착수 시 확정.
- **OI-3 · 충돌 처리** — ✅ **결정(2026-06-24): 수동 블록 우선, 루틴 보류 + 안내.**
- **OI-4 · 완료 기록 모델**: 합성 블록의 완료를 `(routineId, date)`로 별도 관리 vs 승격된 실체 블록의 `block_completions`.
- **OI-5 · 반복 확장**: 격주·월간·N일마다 요구가 실제 있는가(있으면 RRULE 도입, 없으면 비트마스크 고정).

---

## 12. 일정·통합배포 현실성 (2026-06-25 목표)

> 목표: **2026-06-25 작업 완료 → 대표님 컨펌 → 게이트키퍼 통합배포(pullim 플랫폼 병합)**.
> 구현 목표 = **실 BE 데이터 영속**(mock 아님). 아래는 그 전제의 분량·병목·시퀀싱.

### 12.1 분량 추정 (실 BE 기준)
| Phase | 실작업 추정 | 비고 |
|---|---|---|
| R0 `packages/types` | ~0.5d | 타입 + 비트마스크 헬퍼 |
| R1 BE 엔티티·마이그레이션·CRUD | ~1–1.5d | 패턴 존재(planner CRUD 차용)나 신규 테이블·DTO·테스트 |
| R2 BE materialize | ~0.5–1d | 요일·종료조건·충돌 + 단위테스트 |
| R3 `api-client` | ~0.5d | routine CRUD |
| R4 FE 목록·CRUD | ~1d | LNB 락해제 + 폼 |
| R5 FE 미리보기·홈 배지·연동 | ~1d | api-client 연동·e2e |
| **합계** | **~4–5 dev-day** | R6(Could) 제외 |

→ **하루(06-24→06-25)에 실 BE 전체를 통합배포까지 끝내는 것은 불가**.

### 12.2 병목 — 마이그레이션의 통합배포
- BE **코드**는 패턴 차용으로 빠르게 초안 가능. 그러나 **공유 DB에 신규 `routines` 테이블 마이그레이션을 넣는 통합배포**는 **게이트키퍼 소유의 검토된 단계**다. 코드 머지 ≠ 즉시 통합배포.
- CLAUDE.md: BE 새 도메인은 Phase β·명시 승인 영역. 통합배포 마이그레이션은 BE 오너·게이트키퍼와 사전 협의 필수.

### 12.3 권고 배포 시퀀싱
1. **06-25 통합배포**: 이미 머지된 FE(#74~#77: 공유상세·DS토큰·다음블록히어로·캘린더네비) + 본 명세(#78). **루틴 실 BE는 이 배포에 넣지 않음**(위험·분량).
2. **루틴 실 BE + 마이그레이션**: 게이트키퍼와 마이그레이션 배포창을 사전에 잡고, **R0→R5 머지 후 별도 통합배포**(06-25 이후 며칠 내 현실적). FE는 그 전까지 mock으로 dev 검증만, 영속은 BE 배포와 함께 켠다.
3. (대안) 루틴 전체를 한 통합배포로 묶되 **목표일을 06-25가 아닌 BE·마이그레이션 검토 완료 시점으로 조정**.

### 12.4 ✅ 최종 결정 (사용자 확정 2026-06-24) — 출시엔 FE만, 실 BE는 오픈 이후 연기
루틴 실 BE는 (a) pullim-api 팀 의존 + (b) 공유 DB 마이그레이션이라 출시일(06-29)에 못 맞춘다. 따라서:

| 트랙 | 범위 | 시점 |
|---|---|---|
| **출시(06-29)** | **루틴 FE 화면설계(mock)** — LNB 락해제 + 목록·CRUD·홈 자동반영, mock materialize. **미영속**(UI 동작·디자인 확정) | 지금 (R4·R5) |
| **연기(서비스 오픈 이후)** | 실 BE — pullim-api 루틴 엔드포인트·Routine 엔티티·마이그레이션·materialize + api-client 실연동 | 오픈 후 (R0~R3) |

출시 FE 일정: R4·R5 = ~1.5 dev-day → 06-29 여유. OI 3건 결정(§11)은 **연기 BE 설계**에 그대로 사용.

### 12.5 연기 BE 트랙 시작점 (오픈 이후)
- 본 명세를 **pullim-api 요구사항 핸드오프**로 변환 → `pullim-api/docs/planner/`에 cutover와 동일 양식으로 요청(엔티티·엔드포인트·마이그레이션·materialize).
- 게이트키퍼와 마이그레이션 배포창 협의. R0(계약 타입, api-client) → R3(FE 실연동)은 BE 배포에 맞춰 켠다.

---

## 부록 — 현 코드 연결점

- LNB 항목: [apps/planner/components/shell/nav-config.ts](../../apps/planner/components/shell/nav-config.ts) L48 (`/planner/routine`, `locked:true`) → 구현 시 락 해제.
- 블록 엔티티: [apps/backend/src/entities/time-block.entity.ts](../../apps/backend/src/entities/time-block.entity.ts).
- 블록 조회: [apps/backend/src/modules/planner/controller/blocks.controller.ts](../../apps/backend/src/modules/planner/controller/blocks.controller.ts) → materialize 확장 지점.
- 데이터 클라: [packages/api-client/src/pullim-planner.ts](../../packages/api-client/src/pullim-planner.ts) → routine CRUD 추가 지점.
- mock: [apps/planner/lib/mock/planner.ts](../../apps/planner/lib/mock/planner.ts) → `mockRoutines` 추가 지점.
