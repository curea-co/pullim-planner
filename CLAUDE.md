@AGENTS.md

# 풀림 플래너 작업 가이드

이 프로젝트는 원본 `pullim-study-demo`(6 도메인 모놀리식 데모)에서 **풀림 플래너 기능만 추출**한 단독 프로젝트입니다.
SPARK + IPO 하네스 구조는 그대로 유지하되, 모든 도메인 락인은 *플래너 단일*입니다.

## 1. 편집 영역

| 영역 | 경로 |
|---|---|
| **페이지** | `src/app/(student)/planner/` |
| **도메인 컴포넌트** | `src/components/planner/`, `src/components/planner-manage/`, `src/components/planner-builder/`, `src/components/builder/` |
| **mock** | `src/lib/mock/planner.ts` (도메인 권위), `persona.ts`, `curriculum.ts`, `family.ts`, `features.ts`, `subscriptions.ts` |

## 2. 공유 영역 — read 자유, write는 글로벌 작업으로 분리

플래너 락인 중에도 **읽기는 항상 자유**. 단 **편집은 사용자 명시 확인** 후에만 진행.

### 공유 코드 (편집 시 전역 영향)
- `src/components/shell/*` — AppHeader, AppSidebar, BottomNav, nav-config 등 셸 골격 (플래너 전용으로 이미 축소됨)
- `src/components/ui/*` — shadcn/ui 프리미티브
- `src/components/brand/*` — 로고
- `src/lib/tokens/*`, `src/lib/utils.ts`
- `src/app/layout.tsx`, `src/app/(student)/layout.tsx`, `src/app/(student)/page.tsx` (`/` → `/planner` redirect)
- `next.config.ts`, `eslint.config.mjs`, `package.json`, `tsconfig.json`

### 공통 문서 (read only — orchestration 핵심 입력)
- `input/docs-archive/00_풀림_기능기획_Skill.md` — 기획 작성 가이드
- `input/docs-archive/04_풀림_종합_마스터.md` — 풀림 전체 IA 컨텍스트
- `input/docs-archive/06_풀림_시간표_세부기획.md` — 시간표 세부 기획
- `input/docs-archive/08_풀림_플래너_핸드오프.md` — **플래너 도메인 권위** (이 프로젝트의 source of truth)

## 3. 락인 작업 컨벤션

이 프로젝트는 사실상 *영구 플래너 락인* 상태이므로, 별도 도메인 선언 없이도 플래너 boundary가 기본값입니다.

### 해도 되는 것 (편집)
- 플래너 페이지 / 컴포넌트 / mock 수정·신규
- 플래너 내 import 경로 갱신
- 플래너 onboarding 페이지/UX 작업

### 하면 안 되는 것 (사용자 명시 확인 필요)
- 셸·UI 프리미티브 **edit** → "글로벌 작업"으로 컨텍스트 전환 후 진행
- mock 메타 구조 변경 → 데이터 경계가 흔들릴 수 있음

## 4. Orchestration 체크리스트 (작업 마치기 전)

1. **`src/components/shell/nav-config.ts`** — `plannerSection` 안 href가 실제 라우트와 일치하는지
2. **`input/docs-archive/08_풀림_플래너_핸드오프.md`** — 권위 문서의 IA·용어와 코드가 어긋나지 않는지
3. **`src/lib/mock/planner.ts`** — 시간표·블록·컨디션·번아웃 등 시그니처 데이터 구조 일관성

## 5. 도구 보조

| 상황 | 도구 |
|---|---|
| 실행 (개발) | `bun dev` (포트 3030) |
| 검증 (정적) | `bunx tsc --noEmit && bun run lint` |
| 빌드 | `bun run build` |

## 6. 컨벤션 변경

이 가이드 자체를 수정해야 할 때는 **글로벌 작업**으로 분리. 일반 작업 중에 이 파일을 수정하지 말 것.
