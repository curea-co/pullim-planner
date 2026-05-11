# 풀림 플래너 블록 루프 — 완료·액션·이유

## 목표
플래너의 *본질 인터랙션 루프*를 채운다 — "블록 단위 자기조절 + 왜 이 블록인지 이해 + 완료 후 다음으로". 학생이 ① 블록을 자기 의지로 스킵·미루기·완료 처리하고, ② 완료 시 5초 모달로 감정·다음 행동을 결정하며, ③ 비통상적 블록(약점 보강·D-day 가중·이월)에는 그 사유가 라벨로 보이게.

작업 범위: `src/components/planner/**`, `src/components/planner/views/day-view.tsx`, `src/lib/mock/planner.ts`. Q 도메인 ribbon·일일 회고 표면·시험 후 보상은 본 plan에서 제외.

## 작업 항목

### A. 블록 완료 모달 (BlockCompleteDialog)
- [x] **신규 컴포넌트 `block-complete-dialog.tsx`** — shadcn Dialog 기반. 헤더에 블록 제목 + 완료 배지, 자동 표시(정확도 있으면), 감정 5단 radiogroup(선택적), 한 줄 코멘트(선택). 푸터 3 CTA — 종료(ghost) / 5분 휴식(outline) / 다음 블록 시작 또는 오늘 학습 마감(lemon). 내부 입력 reset은 render 중 setState 패턴으로(useEffect 회피).

### B. 블록 카드 액션 메뉴
- [x] **block-card 케밥 메뉴** — `MoreVertical` h-6 w-6 trigger + shadcn `DropdownMenu`. 메뉴 3항목 — 완료 처리(`onComplete` callback) / 30분 미루기 / 스킵. 미루기는 `shiftTime` 헬퍼로 새 시각(예: 19:30→20:00) 노출. break 블록은 케밥 미노출. done 상태는 모든 메뉴 비활성.

### D. Reasoning 라벨
- [x] **mock 타입 확장** — `TimeBlock.reasoning?: string` 추가. 비통상 사유에만 부여:
  - b0 (skipped): "어제 누락분 이월"
  - b3 (doing 미적분): "D-day 빈출 가중"
  - b4 (todo 빈칸 추론): "어제 오답 보강"
- [x] **block-card에 reasoning chip** — 엔진 태그 줄 좌측에 `Sparkles` + chip. `bg-pullim-blue-50 text-pullim-blue-700`. reasoning 없으면 미노출.

### 통합 — day-view 상태 관리
- [x] **day-view에서 BlockCompleteDialog 상태** — `completingBlock: TimeBlock | null`. block-card에 `onComplete={setCompletingBlock}` 주입. `findFollowing(block)`으로 다음 학습 블록(휴식 제외, todo/doing) 산출 → 모달 nextBlock prop으로.

## 검증 (작업 마치기 전)
- [x] `bunx tsc --noEmit` — exit 0
- [x] `bun run lint` — 플래너 도메인 0 errors
- [x] 라이브 200 OK 6동선 (`/planner`, `?view=day|week|month`, `/builder`, `/onboarding`)
- [x] 라이브 인터랙션 (playwright):
  - 케밥 7개 발견 (8 블록 - 휴식 1) ✓ break 블록(저녁 식사)에 케밥 미노출
  - 케밥 클릭 → 메뉴 3항목 (완료 처리 / 30분 미루기 / 스킵)
  - "완료 처리" → 모달 열림 (title="미분 — 적응형 문제 풀이", base-ui slot dialog-content/header/title/description/footer/close 모두 마운트)
  - 감정 4(🙂 괜찮았어요) 선택 → `aria-checked='true'` 갱신
  - "다음 블록 시작" CTA 활성 (nextBlock=b4 빈칸 추론 정복)
  - 코멘트 input placeholder 정상
  - reasoning 라벨이 b0·b3·b4에만 노출되고 b1·b2·b5·b6·b7에는 미노출 (총 3개)
- [x] 모바일(390×844) 시각 캡처 — `planner-mobile-block-cards.png`. 케밥 (•••)·reasoning chip ("D-day 빈출 가중", "어제 오답 보강")·진행 바·CTA 모두 한 카드 안에 시각 경합 없이 정렬

## 본 plan에서 제외 (별도 작업)
- C. 일일 회고 표면 (`/planner/today` 또는 day view 하단 회고 카드) — 후속 plan
- E. 첫 진입 동선 (학생 홈/온보딩 → 빌더 자동) — 일부 글로벌
- F. Q 왕복 컨텍스트 ribbon (Q 도메인 변경) — Q 락인 또는 글로벌
- G. 시험 후 보상 + 다음 빌더 추천 — 후순위

## 트레이드오프 메모
- **모달이 무거우면 학생이 귀찮아함** → 감정 입력 *선택적*, "종료" CTA로 5초 안에 닫기 가능. 감정·코멘트는 마이크로 인터랙션이라 강제 안 함.
- **케밥이 카드를 복잡하게** → status pill 옆에 작게(h-6 w-6). 모바일 long-press 패턴은 미구현(데모 단계). hover/click 시에만 메뉴 트리거.
- **reasoning 라벨이 너무 많이 보이면 노이즈** → 비통상 사유에만(현재 mock 8개 중 3개). 일반 블록은 엔진 태그만.
- **데이터 mutation 안 하는 게 어색할 수 있음** → 데모 단계 일관성. 모든 액션이 toast로 응답하는 패턴은 burnout "쉴래요"·계산기 prev/next와 동일.
