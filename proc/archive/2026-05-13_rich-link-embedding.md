# 2026-05-13 — 링크 임베드 풍부화 (OG 카드 + 메타데이터)

## 목표
`https://pullim-planner.vercel.app/...` 링크를 카카오톡·디스코드·트위터·슬랙·LinkedIn 등에 붙였을 때, 풀림 플래너 브랜드 카드(타이틀·설명·1200×630 이미지)가 풍부하게 노출되도록 정비.

## 배경
- `src/app/layout.tsx`에 OG/Twitter 메타가 텍스트 only로 존재 — 이미지 없음, 카드 타입은 `summary`(작은 썸네일)
- `pullim-classbot`은 동일 패턴으로 동적 OG 이미지 + `summary_large_image` 카드를 이미 적용 — 참조 가능
- production 도메인이 `https://pullim-planner.vercel.app`로 확정됨 → `metadataBase` 명시 가능 (LinkedIn 등 절대 URL 강제 플랫폼 대응)

## 작업 항목

### A. 메타데이터 풍부화 — `src/app/layout.tsx`
- [x] `title`을 `default`/`template` 구조로 변경 — 하위 페이지가 `metadata.title = "주간 리포트"` 식으로 짧게 쓰면 자동으로 ` | 풀림 플래너` 접미
- [x] `keywords`, `authors`, `creator` 추가 — SEO + 검색엔진 임베드 보강
- [x] Twitter card `summary` → `summary_large_image`로 업그레이드 (이미지 카드 노출)
- [x] `metadataBase: new URL('https://pullim-planner.vercel.app')` 추가 — OG/Twitter 이미지 절대 URL 강제 생성

### B. 동적 OG 이미지 — `src/app/opengraph-image.tsx`
- [x] Next.js `ImageResponse`로 1200×630 SVG/PNG 동적 생성 (edge runtime)
- [x] 디자인: 풀림 블루 그라디언트(`#3B6FF6 → #1E3FA8`) + 우상단 레몬(`#E6FF4C`) glow
- [x] 컴포지션: 좌상단 PULLIM PLANNER 로고 영역, 중앙 헤드라인 "풀림 플래너" + "시험까지의 시간을 설계하는 AI", 하단 액센트 "시간표 · 학습 블록 · 컨디션 · 번아웃 케어"

### C. Twitter 이미지 — `src/app/twitter-image.tsx`
- [x] `opengraph-image`에서 default·alt·size·contentType re-export (runtime은 정적 파싱이라 직접 선언)

### D. 검증
- [x] `bunx tsc --noEmit` 통과
- [x] dev 서버에서 `/opengraph-image` 직접 호출 — 1200×630 PNG 200 응답 (227KB)
- [x] dev 서버에서 `/planner` HTML 응답에 `<meta property="og:image">`, `<meta name="twitter:card" content="summary_large_image">`, `<meta name="twitter:image">` 포함 확인
- [x] 비주얼 점검 — 풀림 블루 그라디언트 + 레몬 액센트 + 한글 정상 렌더

### E. 배포 (PR 워크플로)
- [x] 브랜치 `feat/rich-link-embedding` 생성, commit, push
- [x] PR 생성 — title: "Rich link embedding — OG image + metadata 풍부화"
- [x] 사용자가 PR 머지 (PR #8, main commit `1b549c2`)
- [ ] Vercel 자동 배포 트리거 확인 — **자동 트리거 실패**. Vercel Git integration 끊긴 상태로 PR #8 commit이 Deployments에 안 잡힘. Promote to Production 사용자 액션 필요 (PR #7과 함께 처리)

### F. production 검증 (Promote 후 진행)
- [ ] `https://pullim-planner.vercel.app/opengraph-image` → 1200×630 PNG 응답
- [ ] `https://pullim-planner.vercel.app/planner` HTML에 `og:image`, `twitter:image`, `summary_large_image` 메타 포함
- [ ] 카카오톡 임베드 디버거 또는 실제 톡방 테스트로 카드 갱신 확인
  - 카카오톡은 자체 캐시가 있어 첫 임베드 이후 12~24h 갱신 지연 가능 → 새 URL이면 즉시 갱신

## 완료 기준
- A·B·C·D 모두 체크
- production URL이 풍부 카드로 임베드 (1200×630 풀림 블루 이미지 + 타이틀 + 설명)
- 기존 페이지 회귀 없음 (타입체크 통과, 셸·UI 미변경)

## 참고
- 참조 구현: `~/dev_git/pullim-classbot/src/app/{layout,opengraph-image,twitter-image}.tsx`
- 어제 plan: `proc/plan/2026-05-13_prod-followup-and-next.md` (Vercel Git integration 복구 미확정 — 본 작업 push로 자동 트리거 여부 검증 가능)
- Next.js 16 metadata API: `node_modules/next/dist/docs/` 참고
- 풀림 브랜드 토큰: `src/app/globals.css` (`--color-pullim-blue-500: #3B6FF6`, `--color-pullim-lemon: #E6FF4C`)
