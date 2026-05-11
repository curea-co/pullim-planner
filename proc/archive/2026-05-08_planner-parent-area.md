# 풀림 학부모 영역 + 역할 스위처 + 단순 알림

## 목표
- **새 라우트 영역** `(parent)/*` — 학부모 홈 + 자녀 카드 + 자녀 상세 리포트 + 알림 피드
- **역할 확장** — `Role` 타입 'student' | 'teacher' → 'student' | 'teacher' | 'parent'. AppShell·AppHeader·AppSidebar·MobileDrawer·Breadcrumb이 'parent' 분기 처리
- **수정 요청 단순 알림** — 학부모가 "수정 요청" 클릭 시 toast만 (48h 자동 적용 배너 미구현)
- **결제 mock은 placeholder만** — Plan C에서 본구현. 본 plan은 "구독 시작" 카드의 *placeholder UI*만

## 작업 범위 — *대규모 글로벌 영역 침범 (사용자 명시 동의 받음)*
- **신규**: `src/app/(parent)/*`, `src/components/parent/*`, `src/lib/mock/parent-notifications.ts`
- **수정**: `src/components/shell/{nav-config.ts, app-shell.tsx, app-header.tsx, app-sidebar.tsx, mobile-drawer.tsx, breadcrumb.tsx}`
- **mock 확장**: `family.ts` 그대로 사용

## 작업 항목

### A. Role 확장 + shell 분기
- [x] **`nav-config.ts`** — `Role` 타입에 'parent' 추가
- [x] **`parentNav: NavGroup[]`** 신규 — 홈 / 자녀 리포트 / 알림(잠금) / 구독(잠금) / 소개(잠금) — 도메인 GNB 없음 단일 그룹
- [x] **`navForRole`**, **breadcrumb root** 분기 추가 ("풀림 보호자")
- [x] **AppShell** — role='parent' 분기 (BottomNav/CoachFab 미노출, padding은 학생/교사와 동일)
- [x] **AppHeader** — 로고 라벨 "보호자", 프로필에 `${currentPersona.name} ${currentParent.name}`, 역할 전환 3-way cycle (`roleSwitchNext` map: 학생→교사→보호자→학생)
- [x] **AppSidebar** — aria-label "보호자 메뉴" 분기 + FullNav가 parentNav 그대로 렌더
- [x] **MobileDrawer** — sheet 헤더 라벨 분기 ("스터디"/"교사"/"보호자")
- [x] **RoleSwitcher** — 학생/교사 토글에 보호자 추가 (3-way)

### B. 학부모 홈 — `(parent)/layout.tsx` + `(parent)/parent/page.tsx`
- [x] **layout** — AppShell role="parent"
- [x] **page** — 자녀 카드 + 부모 인사이트 + 알림 피드 + 구독 placeholder를 1.4:1 grid로
- [x] **route group 충돌 해결** — `(parent)/page.tsx`는 `(student)/page.tsx`와 `/`로 충돌 → `(parent)/parent/page.tsx`로 이동 ((teacher) 패턴과 동일)

### C. 자녀 상세 리포트 — `(parent)/parent/child/[id]/reports/page.tsx`
- [x] **읽기 전용 부모 톤** — ConsentNotice + ParentInsight + WeeklySummary/MonthlySummary 재사용
- [x] **"수정 요청 보내기"** CTA — `EditRequestDialog` 모달 (카테고리 3 + 메시지 입력 + toast 응답)

### D. mock — `parent-notifications.ts` 신규
- [x] `ParentNotification` 타입 + 6 kinds + `seededParentNotifications` 5건
- [x] `getParentNotifications()` — consentLog 어댑터 + 시뮬 알림 합쳐 시간 역순

### E. 컴포넌트 — `src/components/parent/*`
- [x] `child-card.tsx` — 자녀 정보 + 오늘 메트릭 3 + 상세 리포트 CTA
- [x] `notification-feed.tsx` — 6 kind별 아이콘/톤 + 안 읽음 배지 + 상대 시간
- [x] `parent-insight.tsx` — `dailyReflection` 기반 부모용 인사이트 4종 룰 (정답률·미수행·감정 high/low)
- [x] `subscription-placeholder.tsx` — Plan C 진입 placeholder, 클릭 시 toast
- [x] `edit-request-dialog.tsx` — 3 카테고리 선택 + 메시지 + 단순 알림 toast

### 추가 작업 — 한국어 카피 정합
- [x] `josa(word, kind)` 헬퍼 신규 (persona.ts) — 받침 분기 ("이/가", "을/를", "은/는", "와/과")
- [x] 모든 부모 영역 카피에서 "이(가)" → `josa(name, '이/가')`로 교체

### F. 검증
- [x] `bunx tsc --noEmit` — exit 0
- [x] `bun run lint` — 학부모 영역 0 errors (LucideIcon 미사용 1건 정리)
- [x] 라이브 200 OK 7동선 — `/parent`, `/parent/child/student_001/reports?view=day|week|month`, 회귀 `/` / `/planner/reports` / `/teacher`
- [x] 라이브 인터랙션 (playwright DOM 검증):
  - 학부모 홈 — "서연 어머니, 안녕하세요" 헤더, 자녀카드/인사이트/알림 피드/구독 placeholder 모두 노출, 사이드바 aria "보호자 메뉴"
  - 자녀 리포트 — ConsentNotice + ParentInsight + WeeklySummary 동시 노출
  - "수정 요청 보내기" → 모달 열림, 타이틀 "서연에게 요청 보내기", 카테고리 3 (시간 변경/단원 추가/휴식 권유)
  - 프로필 메뉴 → "학생 뷰로 전환" → href `/` (보호자 → 학생 cycle 정확)
- [x] 모바일(390×1000) 캡처 — `parent-home-mobile.png`. 헤더 → 자녀 카드(메트릭 3) → CTA → 인사이트 3 → 알림 피드 모두 정렬, 가로 overflow 없음, "안 읽음 2" 배지 정상

## 본 plan 제외 (Plan C로)
- 토스페이먼츠 결제 mock 본구현
- 구독 게이팅 (자녀 상세 리포트가 free에서 미리보기)
- `/parent/billing` 페이지

## 트레이드오프 메모
- **3-way 역할 전환**이 모바일 햄버거 메뉴에서 길어질 수 있음 — 프로필 드롭다운에 *순환 토글*로 단순화
- **학부모 BottomNav 미노출** — 자녀 카드/알림이 데스크톱 우선이라 학생 모바일과 다른 IA. 추후 수정 가능
- **수정 요청 단순화** — 자녀측 day view에 알림 배너는 안 만듦. 학부모측 toast로만. 후속 plan에서 풀 흐름 가능
