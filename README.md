# 풀림 플래너 — SPARK + IPO 하네스

원본 `pullim-study-demo`(6 도메인 모놀리식 데모)에서 **풀림 플래너 기능만 추출**한 단독 프로젝트입니다.
AI 에이전트(Claude Code, Gemini 등)와 함께 사용하는 **컨텍스트 엔지니어링 하네스 템플릿** 구조를 그대로 유지합니다.

## 구조

```
pullim-planner/
├── input/       # 입력·참고 데이터 (IPO)
│   ├── docs-archive/        # 핸드오프·마스터 문서 (플래너·시간표·종합)
│   └── design-prototype/    # JSX 모형 (planner-ai / planner-custom + 공유)
├── proc/        # 명령 처리 규칙 (SPARK)
│   ├── spec/        # 설계 명세 (00-index ~ 10-roadmap)
│   ├── plan/        # 작업 계획 (비어 있음)
│   ├── archive/     # 완료 작업 로그 (플래너 관련만)
│   ├── research/    # 조사·분석 결과 (gongstagram-timetable 등)
│   └── knowhow/     # 재사용 프롬프트 (비어 있음)
├── output/      # 출력 데이터 (스크린샷·아티팩트)
└── src/         # Next.js 16 App Router 소스
    ├── app/(student)/planner/
    ├── components/{planner,planner-manage,planner-builder,shell,ui,brand,builder}/
    └── lib/{mock,tokens,utils}/
```

## 실행

```bash
bun install
bun dev          # http://localhost:3030 — 자동으로 /planner 진입
```

## 기술 스택

- **런타임**: Bun
- **프레임워크**: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **스타일**: TailwindCSS 4 + shadcn/ui (base-nova)
- **차트**: recharts
- **알림**: sonner
- **아이콘**: lucide-react

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
