# 2026-05-07 카피 정리 — 풀림 플래너 (theta/IRT)

> **상태**: 🟢 완료 (2026-05-07, 라이브 검증 통과 — θ→실력 점수 2건)
> **명세 권위**: [07-branding.md § 5.2](../spec/07-branding.md) (학술 기호 매핑)
> **부모 plan**: [2026-05-06_copy-cleanup-jargon-and-hanja.md](../archive/2026-05-06_copy-cleanup-jargon-and-hanja.md) (Q 도메인 1차 처리, Phase 2.2 grep으로 플래너 사례 발견)
> **분류**: **풀림 플래너 도메인 락인 작업**

## 목표

플래너 도메인 학생 UI 표면의 학술 기호(`θ`) 노출을 § 5.2 매핑대로 한국어로 풀어 쓴다. 한자어 grep은 0건이므로 본 plan은 학술 기호만.

## 작업 항목

### Step 1: 회귀 사례 처리 (이미 grep 완료)

2건:

- [x] **`src/app/(student)/planner/reports/page.tsx:7`** — 리포트 페이지 tagline
  - 현재: `tagline="주간·월간·학기 리포트 — 학습 시간 vs 목표 / θ 추세 / 오답 정복 / 번아웃·감정. 부모·튜터 전송 가능 (학생 승인 후)."`
  - 처리: `θ 추세` → `실력 점수 추세` ✅
- [x] **`src/lib/mock/planner.ts:94`** — 처방 원칙 카피
  - 현재: `principle: '능력치(θ)가 낮은 유형에 학습 시간을 가중 배분',`
  - 처리: `principle: '실력 점수가 낮은 유형에 학습 시간을 가중 배분',` ✅
  - **UI 노출 확인 결과**: `pedagogyEngineMeta` → `components/planner/pedagogy-tag.tsx:14`에서 import → 모달 안 `<p>{meta.principle}</p>` (line 58)으로 학생에게 직접 렌더링됨. 학생 UI 노출 = 교체 적용.

### Step 2: 추가 grep — 누락 확인

- [x] `grep -rn "θ\|theta\|\bIRT\b\|\bσ\b\|마스터리\|Leitner" "src/app/(student)/planner/" "src/components/planner/" "src/components/planner-builder/" "src/lib/mock/planner.ts" --include="*.tsx" --include="*.ts"` 재실행 → 위 2건 외 추가 사례 0건
- [x] **변수명·타입명·JSDoc 코멘트는 그대로 유지** — § 5.2는 학생 UI 노출에만 적용 (식별자 grep 0건)

### Step 3: 한자어 grep (보강)

- [x] `grep -rn "잔존\|임박\|차시\|미달\|미충족\|진척도\|고지\|회신\|익월\|익일\|상기\|하기\|본인 인증" "src/app/(student)/planner/" "src/components/planner/" "src/components/planner-builder/" --include="*.tsx" --include="*.ts"` → **0건** 확인
- [x] 발견 시 § 6.2 표대로 교체. 학습 콘텐츠(`lib/mock/`의 문항·해설)에 등장하면 건드리지 않음. — 해당 사례 없음

### Step 4: 검증

- [x] **§ 6.5 1차 검수**: "고등학생이 한 번 읽고 의미가 잡히는가" self-check — "실력 점수 추세" / "실력 점수가 낮은 유형" 모두 통과
- [x] `pnpm exec tsc --noEmit` 통과
- [x] 라이브 검증 (2026-05-07): `/planner/reports` body innerText에서 `θ` 0건 + "실력 점수 추세" 노출 확인. 전체 tagline 매칭 — "실력 점수 추세 / 오답 정복 / 번아웃·감정. 부모·튜터 전송 가능 (학생 승인 후)." 캡처: [`output/live-shots/2026-05-07_planner-reports-after.png`](../../output/live-shots/2026-05-07_planner-reports-after.png) (production build)
- [x] 콘솔 에러 0건 (`/planner/reports`)
- [x] 학습 콘텐츠 (`lib/mock/` 안 문항·해설) 무손상 — 플래너 mock에는 문항·해설 없음 (블록 메타·교육학 원리만 존재)

### Step 5: 명세 갱신

- [x] [07-branding.md § 5.2](../spec/07-branding.md) "회귀 점검 대상" 표에 플래너 처리 추가 — [`spec-regression-closing` plan](2026-05-07_spec-regression-closing.md)에서 신규 헤딩 "회귀 점검 대상 (2026-05-07 시점)"으로 처리 완료 (플래너 2건 + shell 1건)

## 락인 규칙

편집 OK: `app/(student)/planner/*`, `components/planner/*`, `components/planner-builder/*`, `lib/mock/planner.ts` (단 학습 콘텐츠 텍스트 무손상)
편집 금지: 다른 도메인

## 범위 외

- 풀림 Q (이미 처리), 클래스봇·라이브러리 (theta·한자어 0건), shell (별도 plan)
- 변수명·타입명 (`thetaTrend`, `expectedThetaGain` 등) 변경 — 식별자라 미적용
- § 6.3 불필요 텍스트·컴포넌트 절감 — 별도 plan

## 비고

- 2026-05-06 플래너 도메인 onboarding/페이지 카피 자체에서 한자어가 0건이었던 건 도메인명 자체가 한자어 회피 결정의 결과 (07 § 6.1 참조).
- mock data의 학생 UI 노출 여부는 `lib/mock/planner.ts`를 임포트하는 컴포넌트의 JSX 출력을 따라가서 확인.
- 커밋 메시지: `fix(planner): theta → 실력 점수 per 07 § 5.2`
