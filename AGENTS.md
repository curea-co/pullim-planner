<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (Next.js 16, `apps/planner/`) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Monorepo (bun workspace)

- Apps: `apps/planner` (Next.js 16), `apps/backend` (NestJS 11)
- Packages: `packages/{types,api-client,auth}` — 현재 빈 placeholder
- Package manager: **bun** (workspaces 모드). 명령은 root에서 `bun run <script>` 또는 `bun --filter <pkg> <script>`.
- BE 패턴 권위: [curea-co/pullim](https://github.com/curea-co/pullim) — controller / use-cases / service / interface / infrastructure (clean architecture + Facade)
- 자세한 컨벤션: [CLAUDE.md](CLAUDE.md), 마이그레이션 plan: [proc/plan/2026-05-26_pullim-be-adoption.md](proc/plan/2026-05-26_pullim-be-adoption.md)
