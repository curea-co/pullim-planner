# apps/planner

풀림 플래너 FE — 학생용 학습 플래너. Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui.

## 빠른 시작

```bash
bun install                                       # repo root에서
bun --filter @pullim-planner/planner dev          # http://localhost:3030
```

## 도메인

| 영역 | 경로 | 설명 |
|---|---|---|
| **planner-home** | `/`, `/planner`, `/planner/day` · `/planner/week` · `/planner/month` · `/planner/calendar` | 오늘의 시간표, 리포트, 컨디션, 번아웃 위젯 (라우트 그룹 `(student)`) |
| **planner-manage** | `/planner/manage`, `/planner/manage/new`, `/planner/manage/[id]/edit` | 플래너 list / new / edit (3 페이지 분리) |
| **planner-onboarding** | `/planner/onboarding` | 신규 사용자 온보딩 (planner-home widget 재사용) |
| **planner-reports** | `/planner/reports` | 학습 리포트 |
| **planner-builder** (잔여) | `/planner/builder` → `/planner/manage/new` 로 redirect | 외부 링크 호환용. Phase 4에서 features/ 이식 예정 |

도메인 권위: `input/docs-archive/08_풀림_플래너_핸드오프.md`.

## 디렉터리

```
apps/planner/
├── app/                # App Router 페이지 (no src/)
├── components/         # ui (shadcn) · shell · brand · features/<도메인> · shared
├── lib/                # mock · planner (helper) · hooks · tokens · utils
├── __tests__/          # Jest 단위 테스트
├── test/setup.ts       # 앱 전용 Jest setup
├── jest.config.ts
└── public/             # 정적 자산
```

`src/` 디렉터리는 사용하지 않는다. `@/*` alias는 `apps/planner/` 직속을 가리킨다.

## 명령어

| 작업 | 명령 |
|---|---|
| dev (port 3030) | `bun --filter @pullim-planner/planner dev` |
| build (standalone) | `bun --filter @pullim-planner/planner build` |
| start (prod) | `bun --filter @pullim-planner/planner start` |
| typecheck | `bun --filter @pullim-planner/planner typecheck` |
| lint | `bun --filter @pullim-planner/planner lint` |
| test (Jest) | `bun --filter @pullim-planner/planner test` |

루트에서 `bun run dev:planner` / `bun run build:planner` 도 동일.

## 기술 스택

- **런타임/패키지 매니저**: Bun 1.3.12
- **웹**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4
- **UI**: shadcn/ui + Base UI (DS 패키지 미사용)
- **차트**: Recharts
- **상태**: useState (Container 내부)
- **테스트**: Jest + RTL

## 도커 빌드

```bash
# 컨텍스트는 monorepo 루트
docker buildx build --platform linux/arm64 -f apps/planner/Dockerfile .
```

Next.js standalone 출력 기준. `apps/planner/server.js` 가 진입점, port 3030.

## 현 단계 메모

- BE 미연동 — `lib/mock/*` mock 데이터 중심
- BE 차용 plan: `proc/plan/2026-05-26_pullim-be-adoption.md` (apps/backend NestJS 11, port 4030)
- Container/Presenter 재편 plan: `proc/plan/2026-05-26_container-presenter-adoption.md`
- 인증 미도입 — Phase γ에서 `@pullim-planner/auth` 추상화 위에 구현 예정
- i18n / Sentry / `@pullim/analytics` / `@pullim/remote-config` 미도입 — 별 트랙
- `@vercel/analytics` 는 도입 완료 (`app/layout.tsx` 의 `<Analytics />`, `track()` 호출 패턴 허용)
