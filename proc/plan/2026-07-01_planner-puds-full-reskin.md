# 플래너 전면 PUDS 디자인 재적용 (전 화면 일관 재스킨)

## 목표
플래너 전 화면(~22 라우트·~90 feature 컴포넌트)을 PUDS 디자인 언어로 **조합·레이아웃·위계 수준까지** 일관되게 재스킨해, 레퍼런스인 pullim-web OS 화면 수준의 완성도에 도달한다. 완료 기준: 홈·위저드·리포트·공유·루틴·온보딩·셸이 동일한 PUDS 패턴(카드 elevation·섹션 헤더·간격 리듬·타이포 위계·상태 컴포넌트)을 공유하고, OS와 나란히 놓아도 이질감이 없다.

## ⚠️ 조사로 드러난 재구성 (1차 실패 원인)
1차 시도(프리미티브 cva 클래스만 PUDS 토큰으로 매핑)가 얕게 느껴진 이유는 **토큰이 문제가 아니었기 때문**이다:
- **색**: `pullim-blue-*`·`pullim-slate-*`(1496개 사용·101파일)는 이미 `globals.css @theme`에서 PUDS `--color-primary-*`·`--color-gray-*` 램프에 별칭돼 있음 → **이미 PUDS 색**.
- **radius**: `--radius-*: var(--puds-radius-*)` 별칭 → `rounded-lg`/`xl`이 이미 PUDS jr 반경(18/24px)으로 렌더 → **이미 PUDS 둥긂**.
- **테마**: `<html data-theme="pullim-jr">` 라이브 적용 확인 → 토큰 레이어 정상 작동.
- ⟹ **1차 프리미티브 편집(button/card/input 등)은 이미 적용돼 있던 값을 재지정한 것**이라 체감 변화가 작았다. (단 LNB accent 바·tabs underline·badge 소프트 pill은 실제 신규 가치 → 유지)

**진짜 갭 = 토큰이 아니라 "조합(composition)".** OS가 완성돼 보이는 건 feature 표면 전체가 **동일한 PUDS 컴포넌트 패턴**(카드 구조·섹션 헤더·간격·elevation·empty-state·리스트 로우)을 규율 있게 쓰기 때문. 플래너 feature 컴포넌트는 손으로 만들어져 간격·위계·elevation이 제각각. **이 조합 레이어를 화면 단위로 재스킨하는 것이 본 작업.**

## Phase 0 — 방향 확정 ✅ (결정 완료 2026-07-01)
- [x] **테마 성격 결정 = `pullim-os` 전환** (사용자 결정). 레퍼런스 OS와 동일 미감(프로페셔널·radius 8px·차분). jr(플레이풀·18px) 폐기.
- [x] **테마 전환 적용**: `app/layout.tsx` `<html data-theme>` `pullim-jr`→`pullim-os`. 전 화면 radius 18→8px·elevation·톤 즉시 OS화(모든 토큰 theme-responsive라 1차 편집도 자동 OS 값). typecheck·:3006 green.
- [ ] **레퍼런스 캡처**: OS(os.pullim.local:3001) 주요 화면(홈·설정·서비스 목록) 스크린샷을 패턴 기준으로 확보(카드·섹션·rail·empty-state·stat).
- [ ] **범위/우선순위 확정**: 아래 화면 그룹의 작업 순서(홈 먼저 권고 — 가장 넓고 노출 큼).

## Phase 1 — 파운데이션: 토큰 갭 마감 + 패턴 라이브러리
- [ ] **shadow 토큰 정합**: `shadow-pullim-sm/md`(28+10 사용)가 PUDS `--shadow-*`에 별칭됐는지 확인, 아니면 @theme에 매핑(elevation 일관성의 핵심).
- [ ] **잔여 하드코딩 색 감사**: `pullim-*` 별칭 밖의 raw hex·회색(예: `text-gray-500`, `#...`)이 있으면 PUDS semantic으로 수렴.
- [ ] **PUDS 패턴 세트 정의**(planner 공용 shared/에 소량, 나머지는 클래스 컨벤션 문서화): 카드(elevation·radius·패딩), 섹션 헤더(mono 라벨·타이틀·간격), stat 카드, 리스트 로우, chip/pill, form-field, empty-state, 좌측 accent 활성 패턴(LNB에서 확립). OS `os-tokens.css` 레시피를 planner 토큰으로 매핑해 근거화.
- [ ] **1차 편집 정합**: button 48px·오버레이 radius 등 1차 변경을 패턴 세트와 충돌 없게 재조정(중복·과대 제거).

## Phase 2 — 셸/글로벌 크롬 (전 화면 공통, 레버리지 최상)
- [ ] **LNB(app-sidebar)**: OS rail 매칭 마감(1차 완료분 검수 — accent 바·soft accent·간격·rail-head 라벨).
- [ ] **topbar/app-header**: OS 상단바 리듬(높이·구분선·서비스 스위처·간격).
- [ ] **bottom-nav(모바일)**: OS tabbar 패턴.
- [ ] **page-header·breadcrumb·section-heading·service-switcher**: 공통 헤더/브레드크럼 PUDS 정합.

## Phase 3 — 화면 그룹별 재스킨 (조합·간격·위계)
- [ ] **홈 대시보드 (planner-home, 36 컴포넌트 — 최대)**: 위젯 카드 elevation·간격 리듬·타이포 위계·stat/진도/컨디션/번아웃 위젯을 PUDS 카드·섹션 패턴으로 통일.
- [ ] **위저드/관리 (planner-manage 13 + builder)**: 스텝 카드·폼 필드·CTA·미리보기 PUDS 폼 패턴.
- [ ] **루틴 (planner-routine 6)**: 목록 로우·생성/편집 폼·요일 선택 칩 PUDS 정합.
- [ ] **리포트 (planner-reports 9)**: 리포트 카드·차트 프레임·인사이트 블록 PUDS 카드/섹션.
- [ ] **공유/공스타그램 (studygram 13)**: 인증 카드·피드·친구 목록·닉네임 설정 PUDS 카드/리스트/empty-state.
- [ ] **온보딩·알림 (planner-onboarding 2, notifications 2)**: 온보딩 스텝·알림 리스트 로우.
- [ ] **인증 (auth 6, /login·/signup)**: PUDS auth-card 패턴(OS 로그인과 정합).

## Phase 4 — 스윕 + QA
- [ ] 화면별 :3006 시각 QA(로그인 후 실 데이터) — OS와 나란히 대조.
- [ ] 일관성 패스: radius/간격/elevation/타이포가 화면 간 흔들리지 않는지.
- [ ] typecheck·lint·회귀(mock/bypass) 확인.
- [ ] PR 분리: apps/planner 단독(FE), 화면 그룹 단위로 쪼개 Codex depth 초과 방지(리포 최상위 룰). `next.config.ts`(로컬 SSO)는 커밋 제외.

## 리스크·원칙
- **엔진·API·호출부·의존성 불변** — 클래스/조합만 변경(1차 원칙 유지). Base UI→Radix 엔진 교체는 안 함.
- **토큰 재지정 금지** — 이미 PUDS인 색·radius를 raw var로 되쓰지 말고 semantic/유틸(rounded-lg 등) 사용. 필요한 신규 표현만 arbitrary.
- **화면 단위 PR** — FE/BE 안 섞고, 화면 그룹별로 쪼개 리뷰 수렴.
- **OS 미감 통일** — `pullim-os` 테마 기준(Phase 0 확정). radius/톤/elevation을 OS와 정합. jr 잔재(과한 둥긂 기대·literal 큰 radius) 발견 시 os 값으로 수렴.
