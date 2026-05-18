# 풀림 플래너 — SPARK + IPO 하네스

원본 `pullim-study-demo`(6 도메인 모놀리식 데모)에서 **풀림 플래너 기능만 추출**한 단독 프로젝트입니다.
AI 에이전트(Claude Code, Gemini 등)와 함께 사용하는 **컨텍스트 엔지니어링 하네스 템플릿** 구조를 그대로 유지합니다.

## 구조

```
pullim-planner/
├── input/                   # 입력·참고 데이터 (IPO)
│   ├── docs-archive/        # 핸드오프·마스터 문서 (플래너·시간표·종합)
│   └── design-prototype/    # JSX 모형 (planner-ai / planner-custom + 공유)
├── proc/                    # 명령 처리 규칙 (SPARK)
│   ├── spec/                # 설계 명세 (BE API design 등)
│   ├── plan/                # 작업 계획
│   ├── archive/             # 완료 작업 로그
│   ├── research/            # 조사·분석 결과 (BE setup guide·화면 역분석 등)
│   └── knowhow/             # 재사용 프롬프트 (배포 정책 등)
├── output/                  # 출력 데이터 (스크린샷·아티팩트)
├── drizzle/                 # DB 마이그레이션 SQL (auto-generated)
├── docker-compose.yml       # 로컬 Postgres 컨테이너
├── drizzle.config.ts        # Drizzle ORM 설정
├── .env.example             # 환경 변수 템플릿
└── src/                     # Next.js 16 App Router 소스
    ├── app/(student)/planner/
    ├── components/{planner,planner-manage,planner-builder,shell,ui,brand,builder}/
    └── lib/{mock,tokens,utils,db}/   # db: Drizzle schema + client
```

## 실행

### 처음 한 번 (setup)

```bash
# 1. 의존성 설치
bun install

# 2. 환경 변수 복사
cp .env.example .env.local

# 3. Docker로 Postgres 컨테이너 띄우기
bun run db:up

# 4. DB에 테이블 9개 생성 (drizzle 마이그레이션 적용)
bun run db:migrate
```

### 매일 개발할 때

```bash
bun run db:up    # 컨테이너 꺼져 있을 때만 (이미 떠 있으면 자동 skip)
bun run dev      # http://localhost:3030 — FE + BE 동시 실행
```

`bun run dev`가 Next.js를 띄우면 FE 페이지(`/planner/*`)와 BE API(`/api/*`)가 같은 프로세스에서 같이 동작합니다.

### 자주 쓰는 명령

| 명령 | 설명 |
|---|---|
| `bun run dev` | FE + BE 동시 실행 (port 3030) |
| `bun run db:up` | Postgres 컨테이너 시작 |
| `bun run db:down` | Postgres 컨테이너 종료 (데이터 유지) |
| `bun run db:reset` | 컨테이너 + 데이터 볼륨 삭제 후 다시 시작 (clean start) |
| `bun run db:generate` | `schema.ts` 변경분으로 마이그레이션 SQL 생성 |
| `bun run db:migrate` | 생성된 마이그레이션을 DB에 적용 |
| `bun run db:seed` | mock data → DB 시드 (Ph2) |
| `bun run db:studio` | DB 테이블 GUI (http://localhost:4983) |
| `bun run build` | 프로덕션 빌드 |
| `bun run lint` | ESLint |

### 필요 도구

- **Bun ≥ 1.3** — 패키지 매니저·런타임
- **Docker Desktop** (또는 OrbStack / colima) — Postgres 컨테이너용

자세한 BE 가이드는 [`proc/research/2026-05-18_be-setup-guide.md`](proc/research/2026-05-18_be-setup-guide.md), API 설계는 [`proc/spec/2026-05-18_be-api-design.md`](proc/spec/2026-05-18_be-api-design.md) 참조.

## 기술 스택

- **런타임**: Bun
- **프레임워크**: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **스타일**: TailwindCSS 4 + shadcn/ui (base-nova)
- **차트**: recharts
- **알림**: sonner
- **아이콘**: lucide-react
- **DB**: PostgreSQL 16 (Docker) + Drizzle ORM
- **분석**: Vercel Web Analytics

## 주요 스킬 (.claude/skills)

| 명령 | 설명 |
|------|------|
| `/create-spec` | 명세 작성 |
| `/update-plan` | 작업 계획 생성·업데이트 |
| `/update-spec` | 명세 업데이트 |

## 원본 출처

이 프로젝트는 다음 모놀리식 데모에서 추출되었습니다:
- `/Users/curea/dev_git/[260506] pullim-study-demo`

플래너 도메인 외 기능(풀림 Q·클래스봇·라이브러리·스튜디오·스토어·교사·보호자 영역)은 모두 제거되었습니다.
