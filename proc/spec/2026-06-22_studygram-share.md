# 2026-06-22 — 공스타그램(Study-gram) 공유 기능 명세

> pullim-planner FE에 **공부 인증을 인스타처럼 공유하는 계층**을 얹는 feature 명세.
> 화면구성 Audit/gap 리뷰 + 기능 명세. **본 문서는 요구사항 정의이며, 코드 변경을 포함하지 않는다.**
> 선행 권위: 플래너 도메인 = [input/docs-archive/08_풀림_플래너_핸드오프.md](../../input/docs-archive/08_풀림_플래너_핸드오프.md),
> 데이터 클라 = [packages/api-client/src/pullim-planner.ts](../../packages/api-client/src/pullim-planner.ts),
> 흡수 cutover = [proc/plan/2026-06-21_fe-cutover-golive-handoff.md](../plan/2026-06-21_fe-cutover-golive-handoff.md).

## 결정 (사용자 확정 2026-06-22)

| 항목 | 결정 |
|---|---|
| 공유 모델 | **친구 피드(in-app) + 외부 이미지 export 둘 다** |
| POST 단위(인증 객체) | **하루 인증 카드(StudyProof)** — 그날 학습결과 1장, 재현 가능한 고정 템플릿 |
| 프라이버시 기본값 | **`close_friends`(지정 친구 공개)** — 미성년 우선, 공개 디스커버리 없음 |
| 산출물 | 리뷰 + 본 명세(spec). 구현은 후속 트랙 |
| 계획 CRUD | 이미 완비(pullim-api) → 본 명세는 **공유 계층만** 신규 정의 |

---

## 0. AI 명령지침 (Core Rules)

이 명세를 구현할 AI에게:

1. **깊게 생각하고 스스로 검토하라.** 미성년 학습자 대상 SNS 성격이므로 프라이버시·안전 결정은 보수적으로.
2. **신규 코드를 최소화하라.** 아래 §9 "재사용 매핑"을 먼저 확인하고, 기존 자산(customization 팔레트,
   reports 데이터, ConsentDialog, planner CRUD 패턴)을 우선 재사용하라.
3. **FE/BE를 한 PR에 섞지 마라** (리포 최상위 룰). 공유 계층은 `packages/types` → `packages/api-client`
   → FE/BE 순서로 **단위를 쪼개** 올린다. 공유 타입 PR이 항상 선행.
4. **Container/Presenter 컨벤션** 준수 — 로직 보유 화면은 `features/studygram/{containers,presenters,components,hooks}/`.
5. **배포 정책** — main→prod 자동배포가 켜져 있고 prod env가 비어있다(흡수 핸드오프 §3). 공유 계층은
   **dev에서만 검증**하고, prod 노출은 별도 게이트(엔타이틀먼트/플래그) 뒤에 둔다.
6. **i18n 미도입** — 한국어 하드카피 허용. **shadcn/ui + Base UI** 프리미티브만 사용(`@pullim/design-system` 금지).

---

## 1. 제품 정의 (Product Definition)

### Problem Statement
2026 청소년 학습 트렌드 '공스타그램'(공부 인증을 인스타처럼 올리는 것)이 유행이지만, 학생들은
(a) 인증을 위해 **별도 앱(인스타)에서 수기로 캡션·사진을 만들어야** 하고, (b) 공개 SNS라
**프라이버시·과시 부담**이 크다. pullim-planner는 이미 학습 계획·결과 데이터를 보유하므로,
**계획→실행→결과**가 곧바로 **재현 가능한 인증 카드**가 되고, **지정한 친구에게만** 공유되는
안전한 공스타그램 경험을 제공할 수 있다.

### Product Goal
학습 결과를 **한 번의 탭으로 재현 가능한 인증 카드**로 만들고, **친구 피드(in-app)**와
**외부 이미지 export(인스타/카톡)** 양쪽으로 공유해, 학습 지속(streak·목표)을 사회적 동기로 강화한다.

### Persona
- **주 사용자 — 수험생(중·고/공시), 14~25세.** 공부 인증을 올리고 싶지만 사생활은 지키고 싶다.
  "예쁜 사진"보다 **꾸준함의 기록**을 원한다.
- **친구(피어).** 지정된 close-friends. 서로의 인증을 보고 자극·응원.
- **(기존) 부모.** 이미 reports의 "부모님께 회고 공유" 동선 보유 — 본 기능과 **분리 유지**(부모 ≠ 피어 피드).

---

## 2. 화면구성 Audit — vision 대비 gap (현황)

현 IA(하단탭 4): 홈 · 관리 · 리포트 · 소개 ([nav-config.ts](../../apps/planner/components/shell/nav-config.ts)).

| 공스타그램 요구 | 현재 상태 | 판정 |
|---|---|---|
| 계획 CRUD (POST/GET/PUT) | pullim-api 완비 — `list`/`create`/`update`(PATCH)/`remove` + activate/archive/duplicate ([pullim-planner.ts](../../packages/api-client/src/pullim-planner.ts) `PullimPlannerClient`). UI=`/planner/manage` | ✅ 완성 |
| ② 톤(fancy 등) | `customization{layoutId, weekLayoutId, paletteId}` + 팔레트 7종(pullim_blue/forest/sunset/pastel/mono/mint/rose) — "꾸미기"로 존재 | 🟡 톤 프레이밍·프리셋 부재 |
| ① 주제(한 문장) | `name`+`examLabel`+`motto`+`target` 으로 분해, 빌더에 흩어짐 | 🟡 단일 "주제 한 문장" 표면 부재 |
| ③ 목표(숫자) | 학습시간 `goalHours`·`target`·`streakDays`(학습 연속)만 | 🟡 **포스팅 cadence 목표 부재** |
| 결과 공유 | reports "부모님께 회고 공유" + `ConsentDialog` 한 방향만 | ❌ 친구/또래 공유 없음 |
| 재현 포맷 카드 | `parent-report-card` 1종(부모용) | ❌ 공유용 인증 카드 없음 |
| 친구(지정) 공개 | visibility/friends 개념이 데이터·화면에 없음 | ❌ 없음 |

**결론:** 계획 CRUD·톤(꾸미기)은 이미 받쳐줌. **빈 곳 = 공유 계층 전체** — 인증카드 객체·재현 템플릿·
친구 공개·피드/공유 화면·공스타그램 세팅 진입.

---

## 3. 핵심 기능 정의 (MoSCoW / Sitemap / IA)

### MoSCoW
| 분류 | 기능 |
|---|---|
| **Must** | 공스타그램 세팅(주제·톤·목표) / 하루 인증 카드 생성(StudyProof, 결과 스냅샷) / 재현 가능 템플릿 / 친구 추가·수락 / close-friends 피드 / 공유 동의 게이트 / 외부 PNG export |
| **Should** | 목표 진행 위젯(posted X/N, D-day) / 인증 streak / 캡션 편집(PATCH) / 카드 visibility 변경 / 피드 좋아요·응원(이모지) |
| **Could** | 톤 프리셋 추가(시즌 테마) / 주간 하이라이트 카드 / 친구 랭킹(옵트인) |
| **Won't (이번 범위 밖)** | 공개(public) 글로벌 피드·디스커버리 / 팔로워 모델 / 댓글 쓰레드 / DM / 외부 OAuth 소셜 로그인 / 영상 |

### Sitemap (신규/변경 라우트)
```
/planner                         (기존) 홈
/planner/manage                  (기존) 계획 CRUD
/planner/reports                 (기존) 회고 + 부모 공유
/planner/share                   ★신규 공유 허브 (피드 + 내 인증 + 목표 진행)
  /planner/share/setup           ★신규 공스타그램 세팅(주제·톤·목표) — 온보딩서도 진입
  /planner/share/friends         ★신규 친구 관리(추가·수락·close-friends 지정)
  /planner/share/[proofId]       ★신규 인증 카드 상세(편집·export·visibility)
/planner/onboarding              (기존) 소개 — 세팅 진입 CTA 추가
```

### IA 변경 — 하단탭
- **결정 필요(오픈 이슈 OI-1)**: 4→5 탭(홈/관리/리포트/**공유**/소개) vs 소개를 프로필 메뉴로 내리고
  공유를 4번째 탭으로 승격. **권장: 후자**(탭 5개는 모바일 과밀, 소개는 1회성 가이드라 메뉴로 충분).

### Screen Spec (요약)
| 화면 | 구성요소 | 설명 |
|---|---|---|
| 공유 허브 `/planner/share` | 목표 진행 위젯, 내 인증 그리드(인스타형), 친구 피드 탭, "오늘 인증하기" CTA | 내 탭/친구 탭 토글. 빈 상태=세팅 유도 |
| 세팅 `/share/setup` | 주제 1문장 입력, 톤 프리셋 선택(팔레트 매핑), 목표 기간(`horizonDays`만) | 3-step. 기존 planner 필드 prefill. **MVP: cadence(postsPerDay)는 1 고정 — UI 입력 없음**(BR-2). 다포스트 cadence 입력은 후속 |
| 인증 카드 상세 `/share/[proofId]` | 카드 프리뷰(템플릿), 캡션 편집, visibility 셀렉트, **PNG 내보내기**, 삭제 | 동의 게이트 통과 후 공유 |
| 친구 `/share/friends` | 친구 검색·요청·수락, close-friends 지정 토글, 차단 | 미성년 안전: 요청 승인제 |

---

## 4. 사용자 경험 설계 (UX Flow / Navigation)

### 시나리오 A — 첫 인증(해피 패스)
1. 온보딩/홈에서 "공스타그램 시작" CTA → `/share/setup`
2. **주제** 한 문장 고정(예: "2026 9급 국어/영어 매일 2시간") → **톤** 선택(fancy=sunset 팔레트 등)
   → **목표 기간** 설정("D-100"; MVP 는 하루 1포스트 고정이라 cadence 입력은 없음)
3. 하루 학습 종료 → 홈/리포트의 "오늘 인증하기" → 그날 결과로 **StudyProof 자동 구성**(완료블록·시간·정답률·한줄)
4. 카드 프리뷰 확인 → 캡션 한 줄 → **visibility=close_friends** → **공유 동의** → POST
5. 친구 피드에 노출 + (선택) **PNG export** → 인스타/카톡

### 시나리오 B — 친구 연결
친구 검색/요청 → 상대 수락 → 서로 피드 노출(visibility 범위 내) → close-friends 지정 시 더 좁은 공개.

### Navigation Flow
```
온보딩 ─CTA─▶ /share/setup ─완료─▶ /planner/share
홈/리포트 ─"오늘 인증하기"─▶ 카드 구성 ─동의─▶ POST ─▶ /share/[proofId] ─export─▶ 외부
/planner/share ─친구 탭─▶ /share/friends
```

### RBAC (행위 매트릭스)
| 행위 | 본인 | 친구 | close-friend | 비친구 | 부모(기존 동선) |
|---|---|---|---|---|---|
| 내 인증 카드 보기 | ✅ | visibility≥friends | visibility=close_friends 포함 | ❌ | 별도(reports 공유) |
| 인증 생성/편집/삭제 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 응원(이모지) | ✅ | ✅ | ✅ | ❌ | ❌ |
| 친구 요청 | — | ✅ | ✅ | ✅(승인제) | ❌ |

---

## 5. 운영 로직 및 데이터 모델 (Business Rules / ERD)

### 핵심 비즈니스 규칙
- **BR-1 인증 카드는 결과 스냅샷이다.** 생성 시점의 완료블록·학습시간·정답률·컨디션·한줄회고를
  **동결**한다(이후 원본 변경에 영향 안 받음). 캡션·visibility만 사후 편집(PATCH).
- **BR-2 포스팅 cadence.** 목표는 `{ horizonDays, postsPerDay }`.
  - **MVP: `postsPerDay = 1` 고정** — 목표 카운트·streak 모두 **날짜당 1회**만 집계(같은 날 중복 인증은
    허용하되 진행도에는 1로 계산). validation 의 `goalPostsPerDay` 도 MVP 에선 1 로 제한.
  - **후속(`postsPerDay > 1`)**: 날짜당 1회 집계 규칙과 모순되므로, 다포스트를 지원할 땐 집계를
    **실제 포스트 수 기준**으로 바꾼다(날짜당 최대 `postsPerDay` 까지 카운트). MVP 범위 밖.
- **BR-3 기본 비공개 지향.** visibility 기본 = `close_friends`. `public` 값은 **이번 범위에서 미지원**.
- **BR-4 공유 동의 게이트.** 최초 공유 시 `ConsentDialog`(기존 패턴 재사용) 1회 동의 필수. 미성년
  표준 문구. 동의 철회 시 모든 카드 `private` 전환.
- **BR-5 친구 승인제.** 친구 요청은 상대 수락 전까지 어떤 데이터도 노출 안 함.
- **BR-6 export 워터마크.** PNG export에 서비스 워터마크 + (옵션) 본인 닉네임. 위치정보·실명 미포함.

### ERD (명세 레벨 — 신규 엔티티)
```
User(기존 auth.users) (1) ── (N) StudyProof
User (1) ── (N) Friendship(요청자/수신자, status) ── (1) User   # 무방향 관계(수락 쌍)
User (1) ── (N) CloseFriendDesignation(ownerId→friendId) ── (1) User   # 방향성 공개 지정
User (1) ── (1) StudygramSetting(주제·톤·목표)
StudyProof (1) ── (N) ProofReaction(응원 이모지)
```

| 엔티티 | 필드(요약) |
|---|---|
| **StudygramSetting** | userId, topicLine(주제 1문장), tonePresetId(→paletteId 매핑), goalHorizonDays, goalPostsPerDay, createdAt/updatedAt |
| **StudyProof** | id, userId, date(YYYY-MM-DD), snapshot{completedBlocks, studyMinutes, accuracy, condition, reflectionLine, subjectTags[]}, tonePresetId, caption, visibility(`close_friends`\|`friends`\|`private`), createdAt/updatedAt |
| **Friendship** | id, requesterId, addresseeId, status(`pending`\|`accepted`\|`blocked`), createdAt — **친구 관계 자체는 무방향(수락된 한 쌍)** |
| **CloseFriendDesignation** | id, ownerId(게시자), friendId(허용 대상 viewer), createdAt — **방향성 edge**: 게시자 `ownerId` 가 자신의 `close_friends` 카드를 볼 수 있게 `friendId` 를 지정. **전제(BR-5): `ownerId↔friendId` 의 `Friendship.status=='accepted'` 가 있어야만 지정 가능**(승인 안 된/임의 사용자 지정 불가). 공개 판정: proof 의 `userId == ownerId` 이고 `visibility==close_friends` 면, **(i) accepted Friendship 존재 && (ii) `friendId == 현재 viewer` 인 designation 존재** 둘 다 충족 시에만 노출. A→B 지정이 B→A 를 만들지 않음(권한 누수 방지) |
| **ProofReaction** | id, proofId, userId, emoji, createdAt |

### Validation Rules
| 필드 | 제약 |
|---|---|
| topicLine | 1~60자, 필수 |
| goalHorizonDays | 1~365 정수 |
| goalPostsPerDay | 정수. **MVP=1 고정**(BR-2). 후속 다포스트 시 1~3 |
| caption | 0~140자 |
| visibility | enum 3종, 기본 `close_friends` |
| date | 미래 날짜 금지(오늘 이하) |

### API 계약(제안 — pullim-api `/planner/studygram/*`, 쿠키 SSO)
| 메서드·경로 | 용도 |
|---|---|
| `GET /planner/studygram/setting` · `PATCH …/setting` | 세팅 조회·upsert |
| `POST /planner/studygram/proofs` | 인증 카드 생성(결과 스냅샷) |
| `GET /planner/studygram/proofs?scope=mine\|friends` | 내/친구 피드 |
| `PATCH /planner/studygram/proofs/:id` | 캡션·visibility 수정 |
| `DELETE /planner/studygram/proofs/:id` | 삭제 |
| `POST /planner/studygram/friends` · `PATCH …/:id`(accept/block) · `GET …/friends` | 친구 관계(무방향, 승인제) |
| `PUT /planner/studygram/close-friends/:friendId` · `DELETE …/:friendId` · `GET …/close-friends` | close-friend **지정 생성/해제/목록** — `CloseFriendDesignation`(ownerId=호출자, friendId=path) 방향성 edge. `Friendship` 의 status 변경(accept/block)과 별도 |
| `POST /planner/studygram/proofs/:id/reactions` | 응원 |

> ⚠️ 계약은 `PullimPlannerClient` 패턴([packages/api-client/src/pullim-planner.ts](../../packages/api-client/src/pullim-planner.ts))을
> 그대로 따른다(쿠키 인증, `on401` 래핑, raw JSON). **export(PNG)는 클라이언트 렌더**라 BE 불필요.

---

## 6. 콘텐츠 데이터셋 (Seed / Samples)

- **톤 프리셋 ↔ 팔레트 매핑(초기 5종)**: `fancy→sunset`, `calm→mint`, `classic→pullim_blue`,
  `minimal→mono`, `soft→pastel`. (나머지 forest/rose는 Could 단계 추가.)
- **인증 카드 슬롯(고정 템플릿)**: 상단 날짜·D-day → 과목 태그칩 → 완료블록 N/총 → 학습시간 → 정답률
  → 컨디션 이모지 → 한줄 회고 → 하단 톤 팔레트 배경 + 워터마크.
- **샘플 데이터 출처**: 기존 mock 재사용 — `apps/planner/lib/mock/planner.ts`(블록·컨디션·번아웃),
  reports의 weekly/daily summary. 친구·인증은 mock 3~5건 신규 시드.
- **참조 이미지**: [input/planner/](../../input/planner/) 의 홈·리포트 캡처(desktop-04~05) — 카드
  콘텐츠 톤 참고.

---

## 7. 브랜딩 (Tone & Voice / Microcopy)

- **성격**: 과시가 아닌 **꾸준함의 기록**. "예쁜 사진보다 재현 가능한 포맷"(레퍼런스 원칙).
- **톤**: 위협·경쟁 대신 **응원·자율** (기존 플래너 "위협→권유" 카피 원칙 계승, [11-planner-design.md](11-planner-design.md)).
- **Microcopy**
  | 상황 | 문구(안) |
  |---|---|
  | 세팅 시작 | "오늘부터 꾸준함을 기록해요. 주제 한 줄부터." |
  | 인증 CTA | "오늘 공부, 한 장으로 인증하기" |
  | 빈 친구 피드 | "아직 친구가 없어요. 같이 달릴 친구를 초대해볼까요?" |
  | 공유 동의 | "내가 고른 친구에게만 보여요. 언제든 비공개로 바꿀 수 있어요." |
  | 목표 달성 | "D-100 중 32일 인증! 페이스 좋아요 🔥" |

---

## 8. 디자인 시스템 (Design Token / Layout)

- **재사용**: shadcn/ui 프리미티브 + `lib/tokens/palettes.ts`(톤) + `pullim-*` 시맨틱 토큰.
  인증 카드는 정사각(1:1) 또는 4:5 비율(인스타 호환).
- **카드 템플릿**: 고정 그리드 슬롯(§6). 톤=배경 팔레트만 바뀌고 **레이아웃은 불변**(재현 가능 포맷 보장).
- **피드**: 모바일 1열·태블릿 2열·데스크톱 3열 그리드. "촘촘한 UI" 원칙(과도 여백 지양).
- **export**: 클라이언트에서 카드 DOM → PNG(예: `html-to-image`류, 도입 시 §9 승인). 워터마크 합성.

---

## 9. 기술 환경 & 재사용 매핑 (SDD)

### 재사용 (신규 코드 최소화)
| 신규 요구 | 재사용 자산 |
|---|---|
| 톤 프리셋 | `customization.paletteId` + `lib/tokens/palettes.ts` |
| 카드 콘텐츠 | reports 데이터(weekly/daily summary, today-reflection), `lib/mock/planner.ts` |
| 공유 동의 | `planner-reports/components/consent-dialog.tsx` 패턴 |
| 인증/세션 | **pullim 쿠키 SSO** — 세션 권위는 `api-client`(`on401` 핸들러) + `GET /planner/me` 판정. 추가 인증 불필요. ⚠️ cutover 에서 자체 `auth-context` 토큰 부트스트랩은 **제거됨** — 이 추상화에 다시 의존하지 말 것(흡수 §10) |
| 데이터 클라 | `PullimPlannerClient` 패턴(`on401`, cookie-http) |
| 화면 구조 | Container/Presenter + `features/studygram/*` |

### 신규 의존(승인 필요)
- PNG export 라이브러리(클라이언트 렌더) — `packages.json`은 글로벌 작업이라 **사용자 승인 후** 추가.

### 배포
- dev-only 검증(흡수 핸드오프 §3 prod 비동작). 공유 계층은 **엔타이틀먼트/플래그 게이트** 뒤 노출.

---

## 10. 단계별 로드맵 (WBS / Phased Rollout)

> 리포 최상위 룰대로 **PR 단위 분리**: 공유 타입(packages) → api-client → BE → FE 순. 각 Phase는 독립 PR 묶음.

| Phase | 범위 | 산출/검증 |
|---|---|---|
| **P0 — 타입·계약** | `packages/types`에 StudyProof/Friendship/**CloseFriendDesignation**/Setting/Visibility(+ close-friend 지정/해제 request·response 타입), api-client 클라 스텁(`PullimStudygramClient`) | 타입 PR 단독. typecheck 통과. close-friends 지정 계약 포함(후속 재계약 방지) |
| **P1 — 세팅(주제·톤·목표)** | `/share/setup` + StudygramSetting CRUD. 톤=팔레트 매핑 | dev에서 세팅 저장·재진입 유지 |
| **P2 — 인증 카드(StudyProof)** | 결과 스냅샷 생성/편집/삭제 + 고정 템플릿 + 동의 게이트 | 카드 POST/GET/PATCH/DELETE, 동의 1회 |
| **P3 — 친구·피드** | **Friendship(무방향 승인제)** + **CloseFriendDesignation(방향성 지정/해제)** + 내/친구 피드 + 응원 — 둘은 별도 구현 대상(close-friends 를 Friendship 속성으로 접지 말 것) | accepted Friendship 전제 + designation 둘 다 충족 시 노출, RBAC 검증 |
| **P4 — export·목표 위젯** | PNG export(워터마크) + 목표 진행(posted X/N·streak) | export 이미지 확인, 목표 카운트 정확 |
| **P5 — IA·온보딩 배선** | 하단탭/온보딩 CTA 연결(OI-1 확정 반영) | 네비 일관성(orchestration 체크리스트) |

### 검증 체크리스트(완료 기준)
- [ ] 비친구는 어떤 인증도 못 봄(RBAC) / 동의 철회 시 전체 private 전환
- [ ] 인증 카드는 생성 시점 스냅샷 동결(원본 변경 무영향)
- [ ] 같은 날짜 목표 카운트 1회 / streak 정확
- [ ] export PNG에 위치·실명 미포함, 워터마크 포함
- [ ] FE/BE PR 분리 준수 + Codex Review 통과

---

## 오픈 이슈 (Open Issues)
- **OI-1** 하단탭 5개 vs 소개 메뉴화(공유 승격) — 권장: 소개 메뉴화. **사용자 확정 필요.**
- ~~**OI-2** `friends` vs `close_friends` 2단계 공개 범위를 모두 둘지, close_friends 단일로 시작할지.~~
  **→ 확정(닫음): 2단계 모델 채택** — visibility enum(`close_friends`\|`friends`\|`private`)·RBAC·API·
  `CloseFriendDesignation` 이 모두 2단계 전제로 서술됨. close_friends 단일로 되돌리지 않는다.
- **OI-3** 엔타이틀먼트 게이트 — 공유 계층을 `flags.planner` 안에 둘지 별도 플래그(`flags.studygram`)로 둘지.
- **OI-4** PNG export 라이브러리 선정·번들 영향(글로벌 의존성 승인).
- **OI-5** 미성년 안전 정책(신고·차단·연령 게이트) 범위 — 법무/정책 확인.
