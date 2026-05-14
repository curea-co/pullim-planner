# 모놀리식 Next.js 데모에서 단일 기능 추출 + Vercel 배포 플레이북

다중 도메인을 한 저장소에 담은 Next.js 데모에서 **한 도메인만 떼어** 독립 프로젝트로 만들고 Vercel에 올리는 절차.
원본: `[260506] pullim-study-demo` (6 도메인) → `pullim-planner` (플래너 단일).
SPARK(`proc/`) + IPO(`input/`, `output/`) 하네스는 그대로 유지.

## 0. 결정해둘 것 (시작 전 1분)

| 질문 | 기본값 |
|---|---|
| 어떤 도메인만 가져오나? | 사용자 명시 |
| 라우트 그룹 `(role)`을 유지할까? | **유지** — 구조 보존이 락인 컨벤션과 호환 |
| 다른 도메인 라우트로 가는 링크는? | 제거 또는 redirect (이 케이스: `/q/talk` FAB 삭제) |
| 다중 역할 셸 (학생/교사/보호자) 처리? | 단일 역할로 축소 (`Role = 'student'`만 남기기) |

## 1. 의존성 그래프 매핑 (먼저 *읽기*만)

`grep`으로 한 번에 훑는다. **편집은 그래프가 완전히 닫힌 뒤에**.

```bash
# 1) 도메인 페이지 + 도메인 컴포넌트가 의존하는 모든 @/ import
grep -rn "from '@/" \
  src/app/\(student\)/<domain> \
  src/components/<domain>* \
  | sed -E "s|.*from '(@/[^']+)'.*|\1|" | sort -u

# 2) 셸/공유 컴포넌트가 끌어다 쓰는 mock 모듈
grep -rn "from '@/lib/mock" src/components/shell \
  | sort -u

# 3) 의심스러운 barrel export — lib/mock/index.ts re-export 추적
cat src/lib/mock/index.ts
```

찾을 것:
- **누락 쉬운 mock**: `family`, `features`, `subscriptions` 같이 *공유 데이터*라 도메인 코드에서 무심코 import — `consentTypeMeta`, `currentParent`, `getFeatureRoute`, `hasQAccess` 같은 식별자가 신호
- **공유 type 우회**: 도메인 mock이 다른 mock의 `SubjectKey`, `ConsentType`을 type-import — `import type` 라인 별도 확인
- **빌더/스텝 인디케이터**: `components/builder/step-indicator.tsx` 같이 도메인명에 안 묶인 공유 폼 부품

## 2. 파일 복사 (bash 한 블록으로)

```bash
SRC="/path/to/source-monolith"
DST="/path/to/new-project"

# 설정 / 자산
cp "$SRC/{tsconfig.json,next.config.ts,components.json,eslint.config.mjs,postcss.config.mjs,next-env.d.ts,.gitignore,.dockerignore}" "$DST/"
cp -R "$SRC/public" "$DST/"

# 앱 라우트
mkdir -p "$DST/src/app/(role)"
cp "$SRC/src/app/layout.tsx" "$SRC/src/app/globals.css" "$SRC/src/app/favicon.ico" "$DST/src/app/"
cp "$SRC/src/app/(role)/layout.tsx" "$DST/src/app/(role)/"
cp -R "$SRC/src/app/(role)/<domain>" "$DST/src/app/(role)/"

# 도메인 컴포넌트
cp -R "$SRC/src/components/<domain>" "$SRC/src/components/<domain>-manage" "$SRC/src/components/<domain>-builder" "$DST/src/components/"

# 공유 컴포넌트 (전부) — shell은 나중에 다듬는다
cp -R "$SRC/src/components/ui" "$SRC/src/components/brand" "$SRC/src/components/shell" "$DST/src/components/"

# 공유 부품 (grep로 발견한 것만 — 폴더 전체가 아닌 파일 단위)
mkdir -p "$DST/src/components/builder"
cp "$SRC/src/components/builder/step-indicator.tsx" "$DST/src/components/builder/"

# lib
cp -R "$SRC/src/lib/tokens" "$DST/src/lib/"
cp "$SRC/src/lib/utils.ts" "$DST/src/lib/"

# mock — 도메인 + 의존 mock만
mkdir -p "$DST/src/lib/mock"
cp "$SRC/src/lib/mock/{<domain>,persona,curriculum,family,features,subscriptions}.ts" "$DST/src/lib/mock/"
```

## 3. 셸을 단일 역할로 다이어트

원본 셸은 multi-role (학생/교사/보호자) 가정으로 작성되어 있다. 단일 도메인 추출본에서는:

| 파일 | 변경 |
|---|---|
| `shell/nav-config.ts` | `Role = 'student'`로 narrow, `studentDomains`를 단일 도메인만, `studentBottomTabs` 2탭으로, breadcrumb root와 도메인 라벨이 같으면 dedup |
| `shell/app-header.tsx` | `currentTeacher`/`currentParent` 분기 제거, ProfileMenu에서 역할 전환 메뉴 삭제 |
| `shell/mobile-drawer.tsx` | `RoleSwitcher` import 제거 |
| `shell/app-sidebar.tsx` | `FullNav` 분기 통째 제거 (student 전용), 홈 단독 row + divider도 단일 도메인이면 어색하므로 도메인 row 하나로 단순화 |
| `shell/app-shell.tsx` | `CoachFab` 등 다른 도메인 진입 위젯 제거 |
| `shell/coach-fab.tsx`, `role-switcher.tsx` | **삭제** |

`lib/mock/index.ts` barrel은 필요한 모듈만 re-export로 줄인다. *원본의 barrel은 전부 re-export하므로 그대로 두면 빌드는 되지만 컴파일 시 dead path 추적이 늘어난다.*

## 4. 라우트 보정

- `/` 진입점이 다른 도메인 홈을 가리키면 `redirect('/<domain>')` 한 줄짜리 page.tsx로 교체
- 도메인 안에 다른 도메인 슬러그로 link하는 곳 (예: `/q/talk`)이 있으면 grep으로 찾고 삭제 또는 `'#'` 처리

## 5. 검증 순서

```bash
bun install
bunx tsc --noEmit          # 타입 errror 0가 첫 게이트
bun run dev -p <free-port> # Ready in ~250ms이 정상치
# 라우트 probe
for path in / /<domain> /<domain>/sub1 /<domain>/sub2; do
  /usr/bin/curl -s -o /dev/null -w "%{http_code}  $path\n" "http://localhost:<port>$path"
done
```

흔히 빠뜨리는 게이트:
- `recharts` 빈 컨테이너 경고는 **원본에도 있던 무해 경고** — 빌드 실패 아님
- `next/font/google` 사용 시 빌드 머신 인터넷 필요 (Vercel은 OK, 일부 사내 빌드 환경은 차단)

## 6. GitHub 연동 (기존 빈-아닌 repo가 있을 때)

```bash
git init -b main
git add -A
git -c user.name="<name>" -c user.email="<email>" \
  commit -m "Extract <domain> feature from <source>"
git remote add origin <repo-url>
git fetch origin main
git -c user.name="<name>" -c user.email="<email>" \
  merge origin/main --allow-unrelated-histories -X ours \
  -m "Merge remote initial commit (keep <domain> README)"
git push -u origin main
```

핵심: `-X ours` (strategy *option*, 파일별 충돌 해결) vs `--strategy=ours` (history 통째 무시) **혼동 금지**. 원격의 빈 README와 우리 README를 자동 병합하려면 **`-X ours`**.

## 7. Vercel 배포 (GitHub 연동 자동)

```bash
vercel whoami                     # 로그인 확인
vercel link --yes --project <name>  # 프로젝트 생성/연결 + GitHub 자동 연동
# 첫 배포는 push 이후에 link했으면 자동 트리거 안 됨 → 명시 트리거
vercel --prod --yes
```

이 케이스의 실제 소요: 빌드 ~33s, 14 페이지 (13 static + 1 dynamic).
Vercel은 `next.config.ts`의 `output: "standalone"`을 **무시**하므로 Docker용 설정을 그대로 둬도 무방.

### 7.1 Webhook 검증 — `vercel link` 직후 한 번 더 확인

`vercel link --yes` 후 GitHub 자동 연동이 *되었다고 보이는 상태에서도* webhook이 실제로 등록 안 된 케이스가 있다. 증상: main에 새 commit push → Vercel Deployments에 새 build가 잡히지 않음.

검증 절차:
```bash
# 1) main에 trivial commit (빈 줄 추가 등) push
git commit --allow-empty -m "chore: webhook probe" && git push
# 2) 30~60초 대기 후 Vercel deployments 목록 확인
vercel ls 2>&1 | head -5
# 3) Age 컬럼이 갱신됐는지 확인 — 안 됐으면 webhook 끊김
```

webhook이 안 되면 Vercel Dashboard → Settings → Git → Connect Git Repository를 다시 마무리. GitHub 권한 페이지에서 organization access 추가가 필요할 수 있다 (`curea-co` 같은 org는 owner approval 별도).

복구 안 되면 임시방편으로 `vercel --prod --yes`를 머지마다 수동 실행. 비용은 매 머지마다 사람 한 번 더 손이 가는 것 — long-term 우회는 안 된다.

### 7.2 임베딩 / 메타데이터 carryover

`src/app/layout.tsx`의 `metadata` 객체, `opengraph-image`/`twitter-image` 라우트, `public/favicon.ico`, `public/logo.svg` 등이 원본 모놀리식 브랜드 그대로 남아 있다. 처음 production deploy 시 카톡·Twitter 카드는 원본 브랜드명·설명을 그대로 노출한다. 추출 직후 일괄 점검:

| 파일 | 갱신 |
|---|---|
| `src/app/layout.tsx` | `metadata.title`·`description`·`openGraph`·`twitter` 객체 도메인 단일 브랜드로 |
| `src/app/opengraph-image.tsx`, `twitter-image.tsx` | 동적 OG 이미지의 텍스트·색·로고 |
| `public/favicon.ico`, `apple-icon.png`, `icon.png` | 브랜드 아이콘 |
| `src/components/brand/logo.tsx` | inline SVG의 텍스트·색 |

검증: production 머지 후 5 UA × 3 라우트 메타 fetch (`curl -A "KakaoTalk" -s URL | grep -E "og:|twitter:"`)로 75/75 PASS 확인. 카톡은 자체 캐시가 있어 도메인 단위로 ~24h 잔존하므로 staging 카톡 채팅 미리보기로 별도 확인.

## 8. 함정 모음

| 증상 | 원인 | 조치 |
|---|---|---|
| `Cannot find module '@/components/shell/mock-browser'` | `*-onboarding/page.tsx`가 mock-browser를 import하는데 셸 다이어트할 때 같이 지움 | mock-browser는 도메인 onboarding 페이지가 쓰므로 **유지** |
| Type narrow 후 `role === 'parent'` 비교 에러 | `Role`을 `'student'`로 narrow했더니 dead branch가 TS strict에 걸림 | 해당 분기 함수 통째 제거 (FullNav 같은 것) |
| 빌드는 되는데 production에서 빈 영역 | recharts container가 0×0 — 부모에 명시적 height 없음 | dev 단계에서 같은 경고가 보임. Vercel 배포는 진행 가능, 후속 UI 작업 |
| 새 repo에 force push 회피 필요 | 기본 README가 이미 있음 | `git merge --allow-unrelated-histories -X ours` |
| 머지 후 production이 갱신 안 됨 | Vercel Git webhook 끊김 (org access 누락 등) | §7.1 확인 절차 → Settings → Git 재연결. 우회는 `vercel --prod --yes` |
| 카톡 카드에 원본 브랜드명 노출 | `app/layout.tsx` metadata + opengraph-image가 carryover | §7.2 메타 일괄 갱신 + 5 UA × 3 라우트 fetch verify |
| `output: "standalone"` 잔존 | Docker용 설정인데 Vercel은 무시함 | 그대로 둬도 무방. 빌드 영향 없음 |
| `lib/mock/index.ts` barrel이 추출본에 없는 mock 모듈을 re-export | 원본 barrel을 그대로 복사 | barrel을 *남은 모듈만* re-export로 정리 — 안 정리해도 빌드는 되지만 dead path 추적 비용 증가 |

## 9. 산출물 체크리스트

- [x] `bunx tsc --noEmit` 통과
- [x] `/`, `/<domain>`, `/<domain>/*` 모두 200 또는 의도된 redirect
- [x] `proc/spec/` 원본 그대로 (도메인 무관한 일반 명세)
- [x] `proc/archive/` 해당 도메인 관련 작업 로그만
- [x] `input/docs-archive/` 도메인 권위 문서 + 컨텍스트 마스터 1~2개
- [x] `CLAUDE.md`가 단일 도메인 락인 가이드로 재작성됨
- [x] Vercel production URL 200 응답
- [x] §7.2 메타데이터 5 UA × 3 라우트 75/75 PASS
- [ ] §7.1 webhook 자동 트리거 검증 — *이 케이스 미해결, `vercel --prod` 우회 중*

## 10. 이 케이스의 시간 분포 (참고)

| 단계 | 실측 |
|---|---|
| §1 의존성 그래프 매핑 | ~10분 (grep 3회 + barrel 추적) |
| §2 파일 복사 | ~3분 (한 블록 실행) |
| §3 셸 다이어트 | ~25분 (FullNav 제거 + RoleSwitcher 삭제 + barrel 정리) |
| §4 라우트 보정 | ~5분 (FAB·`/q/talk` 삭제 + `/` redirect) |
| §5 검증 (tsc + dev + curl probe) | ~5분 |
| §6 GitHub 연동 (`-X ours` 머지 포함) | ~5분 |
| §7 Vercel 첫 배포 + §7.2 메타 갱신 | ~20분 |
| §7.1 webhook 디버깅 (미해결, ~2회) | ~30분 (carry over) |
| **합계** | ~100분 (webhook 미해결 시간 포함) |

핵심 학습: 페이지·컴포넌트 추출 자체는 빠르다 (~50분). **셸 다이어트와 인프라 carryover(메타·webhook)가 시간을 먹는다.** 다음 추출 작업에서는 §3·§7.2를 미리 체크리스트화하면 ~30분 단축 가능.
