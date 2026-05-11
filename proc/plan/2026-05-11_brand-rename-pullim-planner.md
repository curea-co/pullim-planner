# "풀림 스터디" → "풀림 플래너" 브랜딩 통일

## 목표

링크 미리보기·브라우저 탭·PWA 등 사용자에게 노출되는 모든 문구가 "풀림 플래너"로 일관되게 표시된다. (현재 Vercel 임베딩에 "풀림 스터디 — AI 학습 파트너"가 나오는 문제 해결.)

## 조사된 현행 코드

`grep -rn "풀림 스터디\|Pullim Study\|pullim-study"` 결과:

### A. 임베딩/브랜드 (최우선 — 사용자가 본 그 문구)

[src/app/layout.tsx](src/app/layout.tsx) — Next.js RootLayout metadata
- L15 `title: '풀림 스터디 — AI 학습 파트너'`
- L17 `description: '내 실력에 딱 맞는 문제, ... 풀림 스터디는 고등학생을 위한 AI 학습 플랫폼입니다.'`
- L18 `applicationName: '풀림 스터디'`

문제 1) 브랜드명 오기 2) description의 "AI 튜터·맞춤 문제"는 이 프로젝트에서 제거된 도메인 — 거짓 정보 3) "플랫폼" → 플래너 단일이므로 "AI 학습 플래너"가 정확

### B. UI 잠재 노출

[src/lib/mock/features.ts](src/lib/mock/features.ts)
- L110 stageDescription core: `'출시 필수 — 풀림 스터디의 핵심 5개 기능'`
- L84 features 배열에 `name: '풀림 스터디룸'` (slug=room, stage=future) — 미래 기능 *이름*이라 브랜드 통일 대상과 별개

### C. 개발자 문서 (사용자 노출 0 — 유지 OK)

- `src/lib/mock/features.ts:2` 코드 주석
- `src/components/shell/nav-config.ts:3` 코드 주석 (이미 "풀림 플래너 전용"으로 수정됨)
- `README.md`, `CLAUDE.md` — 원본 `pullim-study-demo` 출처 표기 (historical reference, 유지)

## 설계

### 1. layout.tsx 메타데이터 재작성

**문구 2안 — 의사결정 필요**:

**제안 A** (핵심 가치 강조)
```ts
title: '풀림 플래너 — 시험까지의 시간을 설계하는 AI',
description: '시험 일정을 입력하면 AI가 분 단위로 학습 계획을 짭니다. 풀림 플래너는 고등학생을 위한 AI 학습 플래너입니다.',
applicationName: '풀림 플래너',
```

**제안 B** (핸드오프 슬로건 그대로 — `features.ts:78`)
```ts
title: '풀림 플래너 — AI 학습 파트너',
description: '시험 일정만 입력하면, AI가 분 단위로 완벽한 학습 계획을 짭니다. 풀림 플래너는 고등학생을 위한 AI 학습 플래너입니다.',
applicationName: '풀림 플래너',
```

### 2. OG/Twitter 메타 추가 (현재 누락)

미리보기 정확도를 위해 `openGraph`, `twitter` 메타 명시:
```ts
openGraph: {
  type: 'website', locale: 'ko_KR',
  title: <위와 동일>, description: <위와 동일>,
  siteName: '풀림 플래너',
},
twitter: { card: 'summary', title: <동일>, description: <동일> },
```

OG 이미지 파일은 별도 PR (현재 없음).

### 3. features.ts 문구 정리

- L2 주석 → "풀림(원본 14개 기능) 메타 — linkedFeatureSlug 라우팅용"
- L110 → "풀림(원본)의 핵심 5개 기능" (또는 features mock이 UI 노출 0이면 제거)
- L84 "풀림 스터디룸" → **유지 권장** (feature 이름이지 브랜드명 아님)

## 작업 항목

- [x] [src/app/layout.tsx](src/app/layout.tsx) L14-19: title/description/applicationName 교체 (제안 A 채택)
- [x] [src/app/layout.tsx](src/app/layout.tsx): `openGraph` + `twitter` 메타 추가
- [x] [src/lib/mock/features.ts](src/lib/mock/features.ts) L2: 주석 갱신
- [x] features mock의 UI 노출 여부 확인 → `stageDescription`은 UI 미사용 확인 (`grep`으로 검증)
- [x] [src/lib/mock/features.ts](src/lib/mock/features.ts) L110: stageDescription **전체 제거** (D3 결정)
- [x] `bunx tsc --noEmit && bun run lint` 통과
- [x] `bun run build` → 빌드된 HTML 메타 확인: title/description/applicationName/og:*/twitter:* 모두 "풀림 플래너"로 정확히 출력
- [ ] PR 후 Vercel preview URL로 카카오톡·메시지 미리보기 실제 테스트 (PR 머지 후 검증)

## 의사결정 (확정)

- **D1** title/description 문안: **제안 A 채택** — "풀림 플래너 — 시험까지의 시간을 설계하는 AI" / "시험 일정을 입력하면 AI가 분 단위로 학습 계획을 짭니다. 풀림 플래너는 고등학생을 위한 AI 학습 플래너입니다." (플래너 도메인 정확도 우선)
- **D2** features.ts L84 "풀림 스터디룸": **유지** (feature 이름이지 브랜드명 아님)
- **D3** features.ts L110 stageDescription: **전체 제거** (UI 컴포넌트 grep 결과 0건 — `block-card`, `block-complete-dialog`, `day-view`는 `getFeatureRoute`/`findFeature`만 사용)

## 범위 외 (Future)

- OG 이미지 디자인 (`opengraph-image.tsx`) — 별도 PR
- favicon / app icon 디자인 변경
- `manifest.json`(PWA) 추가
- 핸드오프 문서(`input/docs-archive/`)의 "풀림 스터디" 참조 — 원본 문서라 유지
