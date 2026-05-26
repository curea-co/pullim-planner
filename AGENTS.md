<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (Next.js 16, `apps/planner/`) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Monorepo (bun workspace)

- Apps: `apps/planner` (Next.js 16), `apps/backend` (NestJS 11)
- Packages: `packages/{types,api-client,auth}` — 현재 빈 placeholder
- Package manager: **bun** (workspaces 모드). 명령은 root에서 `bun run <script>` 또는 `bun --filter <pkg> <script>`.
- BE 패턴 권위: [curea-co/pullim](https://github.com/curea-co/pullim) — controller / use-cases / service / interface / infrastructure (clean architecture + Facade)
- FE 패턴 권위: [curea-co/pullim](https://github.com/curea-co/pullim) `apps/web/components/features/*` — **Container/Presenter + `features/<domain>/`** 구조 (Container 33 / Presenter 40 검증)
- 자세한 컨벤션: [CLAUDE.md](CLAUDE.md), 마이그레이션 plan: [proc/plan/2026-05-26_pullim-be-adoption.md](proc/plan/2026-05-26_pullim-be-adoption.md), FE 재편 plan: [proc/plan/2026-05-26_container-presenter-adoption.md](proc/plan/2026-05-26_container-presenter-adoption.md)

# FE Container/Presenter 컨벤션 (apps/planner)

로직 보유 페이지(80줄+)는 `Container + Presenter`로 분리한다. `page.tsx`는 마운트만.

| layer | 위치 | 책임 | 금지 |
|---|---|---|---|
| **page** | `src/app/.../page.tsx` | `<Suspense><XxxContainer /></Suspense>` 마운트만 | useState, fetch, business logic |
| **Container** | `src/components/features/<domain>/containers/XxxContainer.tsx` | 데이터 fetch, state, router/searchParams, 이벤트 핸들러, Presenter에 props 전달 | JSX 마크업 (Provider 래핑은 예외) |
| **Presenter** | `src/components/features/<domain>/presenters/XxxPresenter.tsx` | props로 받은 데이터로 화면 그리기 | useState (UI 전용 작은 토글 예외), fetch, router 직접 호출 |
| **components** | `src/components/features/<domain>/components/*.tsx` | feature 내부 부품 | feature 외부 import |
| **hooks** | `src/components/features/<domain>/hooks/use-xxx.ts` | 재사용 로직 추출 | (선택) |

**예외 — 분리 안 해도 되는 페이지**: thin page (~20줄 이하, redirect/래퍼만). 현 `calendar`, `builder`, `week`, `month`, `day` 등이 해당.
