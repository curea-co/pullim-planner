# 2026-05-29 — Phase 4: 잔여 폴더 통합 + import 경로 일괄 정리

> **상태**: 진행 중
> **브랜치**: `feat/fe-container-presenter-phase4`
> **부모 plan**: [2026-05-26_container-presenter-adoption.md](2026-05-26_container-presenter-adoption.md)
> **일일 산출물 약속**: [daily_outcome/2026-05-29.md](../../daily_outcome/2026-05-29.md)

## 목표

`apps/planner` 의 잔여 컴포넌트 폴더 2개(`builder/`, `planner-builder/`)를 `features/planner-builder/components/` 로 이동하고 전체 import 경로를 일괄 수정. 산출물 B로 `refactor/d-lite` 처리 방향도 결정.

---

## 산출물 A — Phase 4 파일 이동

### A-0. 전제: 미커밋 WIP 4개 성격 분류

현재 `main`(로컬)에 다음 4개 미커밋 변경이 있다:

| 파일 | 상태 | 성격 분류 | 근거 |
|---|---|---|---|
| `apps/planner/components/shell/dev-reset-button.tsx` | `??` (신규) | **dev 유틸 — 독립 커밋** | 개발자 전용 초기화 버튼. mock state를 초기 시드로 되돌리는 도구. Phase 4 파일 이동 로직과 무관. `app-shell.tsx`에서 참조되므로 같이 커밋해야 typecheck 통과. |
| `apps/planner/.gitignore` | `??` (신규) | **dev 유틸 — 독립 커밋** | `.vercel` 항목만 포함. 빌드 아티팩트 무시 규칙. Phase 4와 관계 없음. dev-reset-button과 같은 커밋에 묶어도 무방. |
| `apps/planner/components/shell/app-shell.tsx` | `M` (수정) | **dev 유틸 — 독립 커밋** | `DevResetButton` import + 렌더를 추가한 변경. dev-reset-button 신규 파일에 의존. 같은 커밋에 묶여야 typecheck 통과. Phase 4 파일 이동과 섞으면 커밋 목적이 불명확해짐. |
| `apps/planner/lib/mock/planner.ts` | `M` (수정) | **dev 유틸 — 독립 커밋** | `buildInitialPlanners()` factory 패턴 도입 + `resetMockState()` 함수 추가. DevResetButton이 `resetMockState()`를 호출하므로 기능적으로 연결. Phase 4 파일 이동과 무관. |

**결론**: WIP 4개는 "DevResetButton + mock reset factory" 단일 기능 단위. Phase 4 이동 커밋과 **스코프 분리 필수**.

커밋 순서:
1. `chore(dev): DevResetButton + mock resetMockState factory` — WIP 4개
2. `feat(fe): Phase 4 — planner-builder/builder/ 이동 + import 경로 수정` — 파일 이동

---

### A-1. 이동 대상 파일 4개

| 원본 경로 | 대상 경로 |
|---|---|
| `apps/planner/components/builder/step-indicator.tsx` | `apps/planner/components/features/planner-builder/components/step-indicator.tsx` |
| `apps/planner/components/planner-builder/builder-types.ts` | `apps/planner/components/features/planner-builder/components/builder-types.ts` |
| `apps/planner/components/planner-builder/step-content.tsx` | `apps/planner/components/features/planner-builder/components/step-content.tsx` |
| `apps/planner/components/planner-builder/unit-editor-modal.tsx` | `apps/planner/components/features/planner-builder/components/unit-editor-modal.tsx` |

### A-2. import 경로 수정 대상

`git grep` 으로 확인된 외부 참조 7개:

| 파일 | 구 import | 신 import |
|---|---|---|
| `features/planner-manage/presenters/NewPlannerPresenter.tsx` | `@/components/planner-builder/builder-types` | `@/components/features/planner-builder/components/builder-types` |
| `features/planner-manage/presenters/EditPlannerPresenter.tsx` | `@/components/planner-builder/builder-types` | `@/components/features/planner-builder/components/builder-types` |
| `features/planner-manage/containers/NewPlannerContainer.tsx` | `@/components/planner-builder/builder-types` | `@/components/features/planner-builder/components/builder-types` |
| `features/planner-manage/containers/EditPlannerContainer.tsx` | `@/components/planner-builder/builder-types` | `@/components/features/planner-builder/components/builder-types` |
| `features/planner-manage/components/planner-wizard.tsx` | `@/components/builder/step-indicator`, `@/components/planner-builder/step-content`, `@/components/planner-builder/builder-types` | 위 세 경로 → `features/planner-builder/components/*` |
| `features/planner-manage/components/planner-card.tsx` | `@/components/planner-builder/builder-types` | `@/components/features/planner-builder/components/builder-types` |
| `features/planner-manage/hooks/use-planner-form.ts` | `@/components/planner-builder/builder-types` | `@/components/features/planner-builder/components/builder-types` |

내부 상대 import (`step-content.tsx` → `./builder-types`, `./unit-editor-modal`) 는 같은 `components/` 폴더로 이동하므로 경로 변경 불필요.

### A-3. 이동 후 빈 디렉터리 제거

- `apps/planner/components/builder/` — 파일 이동 후 빈 디렉터리 삭제
- `apps/planner/components/planner-builder/` — 파일 이동 후 빈 디렉터리 삭제

### A-4. 분류 (개발가능 / GATED)

| 항목 | 분류 | 근거 |
|---|---|---|
| WIP 4개 → dev 유틸 독립 커밋 | **개발가능** | G4 협의 불필요. shell/mock은 `apps/planner/` 편집 영역 내 자유 |
| 4개 파일 git mv + import 경로 수정 | **개발가능** | `apps/planner/components/` 내부 재편. Phase 4 plan에 명시된 작업 |
| 빈 디렉터리 제거 | **개발가능** | 파일 이동 후 자동 처리 |
| `bun run build:planner` 통과 확인 | **개발가능** | 로컬 검증. CI/CD 트리거 없음 |
| PR 생성 + Codex Review 통과 | **GATED** | 사용자(G1/G3/G4)가 PR 제출·확인. 이 에이전트는 push 금지 |

---

## 산출물 B — `refactor/d-lite` 처리 방향

### B-1. 조사 결과

`git fetch origin` + `git ls-remote origin` 실행 결과:

```
origin = https://github.com/curea-co/pullim-planner.git
```

`refactor/d-lite` 브랜치가 **로컬에도, 원격에도 존재하지 않는다**.

확인된 원격 브랜치:
- `remotes/origin/main`
- `remotes/origin/dev`
- `remotes/origin/docs/canonical-stack-bible`
- `remotes/origin/refactor/phase-beta-common`

`refactor/d-lite` 없음 — diff 검토 불가.

### B-2. 처리 방향 결정

Phase 4 대상 4개 파일과 `refactor/d-lite` 간 overlap 여부를 판단할 diff가 존재하지 않으므로, **현 시점에서 overlap 없음으로 간주하고 Phase 4를 독립 PR로 진행**. 브랜치가 나중에 push되면 Phase 4 PR 머지 전에 재확인 필요.

| 항목 | 분류 | 근거 |
|---|---|---|
| `refactor/d-lite` 존재 여부 확인 | **GATED** | 브랜치가 원격/로컬 모두에 없음. 브랜치 생성 주체(사용자 or 다른 에이전트)가 push해야 diff 검토 가능 |
| Phase 4 독립 PR 진행 | **개발가능** | overlap 없음 가정, 나중에 브랜치 나타나면 재검토 |

---

## 검증 계획

| 단계 | 명령 | 합격 기준 |
|---|---|---|
| 타입체크 | `bunx tsc --noEmit` | 0 error |
| 빌드 | `bun run build:planner` | 0 error |
| 빈 폴더 확인 | `ls apps/planner/components/builder/ apps/planner/components/planner-builder/` | "No such file or directory" |

---

## 커밋 계획

| 순서 | 커밋 메시지 | 포함 파일 | 브랜치 |
|---|---|---|---|
| 1 | `chore(dev): DevResetButton + mock resetMockState factory` | `shell/dev-reset-button.tsx`, `shell/app-shell.tsx`, `lib/mock/planner.ts`, `.gitignore` | `feat/fe-container-presenter-phase4` |
| 2 | `feat(fe): Phase 4 — planner-builder/builder/ → features/planner-builder/components/ 이동 + import 경로 수정` | 이동 4개 파일 + 수정 7개 파일 + 빈 디렉터리 제거 | `feat/fe-container-presenter-phase4` |

---

## 리스크

| 리스크 | 영향 | 완화 |
|---|---|---|
| `refactor/d-lite` 가 나중에 push되어 Phase 4 대상 파일과 overlap | PR 머지 충돌 | Phase 4 PR 머지 전에 브랜치 확인 + rebase |
| `step-content.tsx` 내 상대 import `./builder-types`, `./unit-editor-modal` — 이동 후 같은 폴더이므로 문제없음 | 낮음 | typecheck로 검증 |

---

## 결정 사항 추가 (2026-05-29)

`2026-05-26_container-presenter-adoption.md` §6 결정 사항 테이블에 아래 항목 추가 예정:

| 항목 | 결정 |
|---|---|
| `refactor/d-lite` 처리 방향 | 2026-05-29 기준 로컬/원격 모두 미존재. overlap 없음으로 간주 → Phase 4 독립 PR 진행. 브랜치 push 시 재검토 |
