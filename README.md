# 풀림 플래너

오늘 뭐 공부할지 계획 세우고, 끝나면 결과를 기록하는 학습 플래너예요.
시간표를 짜면 하루 블록이 쫙 펼쳐지고, 공부 마친 블록을 체크하다 보면 오늘 얼마나 했는지 한눈에 보여요.
매일 컨디션도 기록하고, 번아웃이 가까워지면 알림도 와요.

---

**dev 배포:** [dev-planner.pullim.ai](https://dev-planner.pullim.ai/planner) (팀 전용, Vercel 로그인 필요)  
**리포:** 단일 Next.js 앱 (bun). BE는 별도 리포 **pullim-api**(`src/planner/`)가 담당 — 세션(쿠키 SSO)·planner 데이터 모두 pullim-api 로 cutover 완료.

## 현재 구현된 화면

| 라우트 | 기능 |
|---|---|
| `/planner` | 홈 — 월간/주간/일간 캘린더, 오늘 블록 현황, 번아웃 배너, 웰컴 모달 |
| `/planner/manage` | 시간표 관리 — 목록/생성/편집/활성화/보관 |
| `/planner/reports` | 리포트 — 주간 인사이트, 컨디션 추이, 부모 공유 |
| `/planner/notifications` | 알림 목록 |
| `/planner/onboarding` | 온보딩 |
| `/planner/builder` | 시간표 빌더 |

인증은 pullim-api 쿠키 SSO (`dev-api.pullim.ai`). 데이터 레이어는 `lib/api-client` + 일부 mock 혼용.

## 구조

```
pullim-planner/
├── app/                # App Router 페이지 (no src/)
├── components/         # ui (shadcn) · shell · brand · features/<도메인> · shared
├── lib/                # api-client · auth · mock · planner (helper) · hooks · tokens
├── public/
├── __tests__/          # Jest 단위 테스트
├── proc/               # plan / spec / knowhow / archive / research
├── input/              # 기획 문서 (docs-archive 권위)
└── package.json        # bun (단일 앱 — 워크스페이스 아님)
```

## 실행

### 처음 한 번 (setup)

```bash
bun install
cp .env.example .env.local        # 로컬 SSO 값은 proc/2026-06-29_planner-local-sso-setup.md 참조
```

### 매일 개발할 때

```bash
bun run dev               # Next.js dev (port 3006)
```

| 명령 | 설명 |
|---|---|
| `bun run dev` | Next.js dev (port 3006) |
| `bun run build` | Next.js build (standalone) |
| `bun run typecheck` | tsc --noEmit |
| `bun run lint` | eslint |
| `bun run test` | Jest 단위 테스트 |

로컬에서 실 로그인(쿠키 SSO)까지 보려면 pullim-api(`api.pullim.local:3000`)·pullim-web(`pullim.local:3001`)을 함께 띄우고 `http://planner.pullim.local:3006/planner` 로 접속 — 절차는 `proc/2026-06-29_planner-local-sso-setup.md`.

### 필요 도구

- **Bun ≥ 1.3** — 패키지 매니저·런타임

## Docker 이미지 빌드

`Dockerfile` 은 있지만(standalone 출력, `docker buildx build`) **이 레포에는 아직 이미지를 빌드·푸시하는 CI 워크플로가 없다**(`.github/workflows/ci.yml` 은 lint/typecheck/test/`next build` 까지만 — dev 배포는 위 Vercel). 수동으로 이미지를 빌드하는 주체는 `next build` 가 브라우저 번들에 굽는 `NEXT_PUBLIC_*` 값을 **반드시 `--build-arg` 로 전달**해야 한다(`.dockerignore` 가 `.env*` 를 제외해 이미지 안엔 로컬 값이 없음 — 컨테이너 런타임에 env 를 넣어도 이미 구워진 브라우저 코드엔 반영되지 않는다):

```bash
docker buildx build --platform linux/arm64 -f Dockerfile \
  --build-arg NEXT_PUBLIC_PULLIM_API_URL=https://dev-api.pullim.ai \
  --build-arg NEXT_PUBLIC_PULLIM_CSRF_COOKIE=dev-pullim-csrf \
  --build-arg NEXT_PUBLIC_PULLIM_LOGIN_URL=<환경별 로그인 host> \
  --build-arg NEXT_PUBLIC_PULLIM_OS_URL=<환경별 OS host> \
  --build-arg NEXT_PUBLIC_DEV_AUTH_BYPASS=0 \
  --build-arg NEXT_PUBLIC_ENABLE_DEV_RESET=false \
  --build-arg NEXT_PUBLIC_ROUTINE_ENABLED=1 \
  --build-arg NEXT_PUBLIC_REPORTS_ENABLED=1 \
  --build-arg NEXT_PUBLIC_WEAKNESS_ENABLED=1 \
  --build-arg NEXT_PUBLIC_NOTIFICATIONS_ENABLED=1 \
  --build-arg NEXT_PUBLIC_Q_LINK_ENABLED=1 \
  --build-arg NEXT_PUBLIC_REFLECTION_ENABLED=1 \
  .
```

값 설명은 `.env.example`. 시크릿(비-`NEXT_PUBLIC_*`)은 build arg 로 넘기지 않는다 — 런타임 env 로만.

## 기술 스택

| 레이어 | 기술 |
|---|---|
| FE 프레임워크 | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript |
| FE 스타일 | TailwindCSS 4 + shadcn/ui (base-nova) |
| FE 차트·알림·아이콘 | recharts / sonner / lucide-react |
| BE | **pullim-api** (별도 리포, NestJS) — 쿠키 SSO 세션 + `/planner/*` 데이터 |

상세는 [proc/plan/2026-05-26_pullim-be-adoption.md](proc/plan/2026-05-26_pullim-be-adoption.md).
