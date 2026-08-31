@AGENTS.md

# 풀림 플래너 작업 가이드

풀림 플래너 FE — Next.js 16 (App Router), 단일 앱 리포 (모노레포 아님). 학생용 학습 플래너 (시간표, 블록, 컨디션, 번아웃, 리포트).

- 도메인 권위: [input/docs-archive/08_풀림_플래너_핸드오프.md](input/docs-archive/08_풀림_플래너_핸드오프.md)
- BE: **pullim-api** (별도 리포 `/Users/sungho/pullim-api`, `src/planner/`) — 로그인/세션(쿠키 SSO)·planner 데이터 모두 pullim-api 가 담당 (흡수 전환 §10 cutover 완료). 이 리포에 BE 코드 없음
- 로컬 SSO 런북: [proc/2026-06-29_planner-local-sso-setup.md](proc/2026-06-29_planner-local-sso-setup.md) — `planner.pullim.local:3006` + `api.pullim.local:3000`(pullim-api) + `pullim.local:3001`(pullim-web 중앙 로그인)

> ⚠️ **plan 문서 경로 표기 주의** — `proc/plan/*.md` 문서들은 모노레포 시절(`apps/planner/...`) 또는 그 이전(`src/...`) 기준으로 서술돼 있다. 실제 코드는 2026-07-31 평탄화로 리포 루트 직속(`app/`, `components/`, `lib/`)이다. plan 의 의도·완료기준만 참고하고 경로는 현재 트리 기준으로 해석할 것.

## ⛔ 최상위 규칙 — PR은 작은 단위로 쪼개 올린다 (MUST)

- PR diff가 **Codex Review가 한 번에 탐지·수렴할 수 있는 depth를 초과**하면 리뷰가 무한 반복(COMMENTED 누적)되어 머지가 끝나지 않는다. 한 PR = 한 관심사.
- **Codex Review 통과** — PR 머지 전 필수.

## 디렉터리 구조 (src/ 없음 — 리포 루트 직속)

```
pullim-planner/
├── app/                                # App Router
│   ├── tokens/                         # PUDS 토큰 벤더링 (@puds/theme-puds) — 로컬 수정 금지
│   ├── (student)/                      # 플래너 라우트 그룹
│   ├── login/ · signup/                # 인증 (signup → login redirect)
│   ├── layout.tsx · globals.css
│   └── opengraph-image.tsx · twitter-image.tsx
├── components/
│   ├── ui/                             # 프리미티브 — 3레인 혼재 (§ UI 컴포넌트 판별표)
│   ├── charts/                         # PUDS 차트 벤더링 (donut) — README 에 재싱크 ADR
│   ├── shell/                          # AppHeader, AppSidebar, BottomNav, nav-config.ts
│   ├── brand/                          # 로고
│   ├── features/<도메인>/              # Container/Presenter (planner-home, planner-manage, planner-onboarding, planner-reports, planner-routine, auth)
│   ├── shared/                         # 진짜 순수 뷰 (d-day-chip 등)
│   └── planner-builder/ · builder/     # 미이동 (Phase 4에서 features/로 이식 예정)
├── lib/
│   ├── api-client/                     # pullim-api fetch 래퍼 (쿠키 SSO + CSRF) — 구 packages/api-client
│   ├── auth/                           # auth-context, pullim-session-client
│   ├── mock/                           # mock 데이터 (pullim-api 로 점진 교체 중)
│   ├── planner/                        # 도메인 helper (d-day-tier, day-nav, pullim-client 등)
│   ├── hooks/ · tokens/
│   ├── cn.ts                           # PUDS 벤더링 (@puds/cn) — 로컬 수정 금지
│   └── utils.ts                        # cn 재export (레거시 호출부용)
├── public/
├── __tests__/                          # Jest 단위 테스트
├── config/jest.setup.ts                # 공통 Jest mock (next/navigation 등)
├── test/setup.ts                       # 앱 Jest setup
├── proc/                               # plan / spec / knowhow / archive / research
├── input/                              # 기획 문서 (docs-archive 권위)
├── jest.config.ts · tsconfig.json · next.config.ts
├── package.json · bun.lock             # bun (워크스페이스 아님)
└── Dockerfile
```

## UI 컴포넌트 — 3레인 (PUDS 원격 · 로컬 base-ui · 서비스 고유)

**토큰은 PUDS, 프리미티브 파일은 로컬.** 색·라운드·간격·명암은 PUDS 레지스트리에서 받고,
`components/ui/*` 의 프리미티브 11종은 이 리포가 소유한다.

> ⚠️ **2026-08-28 부로 이 규칙의 근거가 갈렸다.** 예전 이유는 "엔진은 로컬" — 이 리포는 `@base-ui/react`,
> PUDS 프리미티브는 Radix 였다. **그 근거는 죽었다.** PUDS v0.5.0 이 `@radix-ui/*` 24개와 `cmdk` 를
> 전부 걷어내 **이제 양쪽 다 `@base-ui/react`** 다(v0.5.0 레지스트리 93개 아이템 중 Radix·cmdk 의존 0개, 실측).
> 규칙 자체는 그대로 서 있지만 **이유가 다르다** — target 충돌과 API 차이다. 아래 「② 로컬 base-ui 프리미티브」.
>
> `proc/plan/2026-07-01_planner-puds-full-reskin.md` 의 "Base UI→Radix 엔진 교체는 안 함"은
> **바꿀 Radix 가 없어져 문장 자체가 무효**가 됐다. 다만 같은 줄의 상위 원칙("엔진·API·호출부·의존성 불변 —
> 클래스/조합만 변경")은 재스킨 작업의 범위 제한으로 여전히 유효하다.
> **결정을 유지할지 다시 볼지는 사람 몫이다 — 에이전트가 뒤집지 마라.**

DS npm 패키지(`@pullim/design-system`·`@pullim/ui`)는 **미설치 — import 금지.** PUDS 는 npm 의존성이 아니라
`components.json` 의 `@puds` 레지스트리에서 **소스를 복사(벤더링)** 해 온다.

### 판별표

| 레인 | 무엇 | 파일 | 규칙 |
|---|---|---|---|
| **① PUDS 원격** | 토큰·유틸·무의존 프리미티브·차트 | `app/tokens/*.css` · `lib/cn.ts` · `components/ui/{card,badge,input,skeleton}.tsx` · `components/charts/donut.tsx` | **로컬 수정 금지.** 고쳐야 하면 PUDS 저장소에 고치고 재설치 |
| **② 로컬 base-ui 프리미티브** | 상류 base-nova + PUDS 레시피 이식 하이브리드 | `components/ui/{button,dialog,sheet,tabs,avatar,label,separator,scroll-area,dropdown-menu,tooltip,progress}.tsx` | **PUDS 프리미티브로 교체 금지** (아래 이유) |
| **③ 서비스 고유** | PUDS 에 없거나 API 가 다른 것 | `components/ui/{meta-row,sonner}.tsx` · `app/os-topbar.css` · `components/{shell,features,shared,brand}/*` | 자유롭게 수정 |

### ① PUDS 원격 — 설치·재설치

레지스트리 URL 은 **경로로 버전이 고정**돼 있다:

```
https://pullim-design-system.vercel.app/v/<버전>/{name}.json
                                        ^^^^^^^^ 여기가 고정 지점
```

> **현재 어느 버전에 고정돼 있는지는 `components.json` 이 유일한 정본이다 — 이 문서에 옮겨 적지 않는다.**
> 박아 두면 핀이 올라가는 순간 낡고, 두 자리가 어긋나면 어느 쪽이 맞는지 알 수 없게 된다.
> 확인은 문서가 아니라 코드로 한다:
>
> ```bash
> jq -r '.registries["@puds"]' components.json
> ```
>
> 아래 판별·업그레이드 스크립트도 전부 이 값에서 버전을 읽는다. 사람이 손으로 맞춰야 하는 사본은
> `components/charts/README.md` 의 `curl` URL **하나뿐**이고, 업그레이드 절차 2번이 그것을 지시한다.

`/v/<버전>/` 의 내용은 PUDS 저장소의 `registry-releases/<버전>/` 에 **커밋돼 있어서** main 에 무엇이 푸시돼도
변하지 않는다. 호스트는 프로덕션 최신을 추종하지만 경로가 고정이라 상관없다.

> **v0.2.0 → v0.3.0 은 이 저장소 기준 파일 변화 0건이다** (2026-08-26 실측). v0.3.0 이 고친 것은
> 크로스카테고리 import 파손 8건인데, 그 8건에 플래너가 설치한 **아이템 7개**(`theme-puds`·`card`·`badge`·
> `input`·`skeleton`·`cn`·`donut`)가 **하나도 포함되지 않는다** — 7개 모두 두 버전 간 페이로드가 바이트 동일하다.
> 재설치해도 diff 가 안 나는 게 정상이니 "설치가 안 먹었다"고 오해하지 말 것. 바뀐 건 버전 핀뿐이다.

> **v0.4.2 → v0.5.0 도 거의 같은 모양이다** (2026-08-31 실측).
>
> **단위에 주의 — 레인 ① 은 아이템 7개이자 파일 10개다.** 바로 위 문단이 세는 「7개」는 **아이템**,
> 아래에서 세는 「10개」는 **파일**이다. `theme-puds` 하나가 파일 4개인 것이 차이의 전부다.
>
> 두 버전 페이로드를 target 별로 대조하면 **파일 10개 중 9개가 바이트 동일**하고, 다른 것은
> `app/tokens/_animations.css` **하나뿐**이다. 열 개를 다 적으면:
>
> | | target |
> |---|---|
> | **동일 9** | `app/tokens/_base.css` · `app/tokens/pullim-os.css` · `app/tokens/pullim-jr.css` · `lib/cn.ts` · `components/ui/card.tsx` · `components/ui/badge.tsx` · `components/ui/input.tsx` · `components/ui/skeleton.tsx` · `components/ui/charts/donut.tsx` |
> | **다름 1** | `app/tokens/_animations.css` |
>
> 그 하나가 **import 되지 않는** 파일이라 컴파일된 CSS 가 양쪽 동일 해시였다. v0.5.0 은 PUDS 가
> Radix → Base UI 로 엔진을 갈아엎은 릴리스인데도 그렇다 — 이 리포가 받아 가는 **파일 10개**가 전부
> 엔진 비의존(토큰·`cn`·무의존 프리미티브·SVG 차트)이기 때문이다.

> ⚠️ **`/r/{name}.json` 을 서비스에서 직접 참조하지 마라.** 같은 호스트지만 `/r/` 은 **항상 main 최신**을
> 가리킨다 — 설치 시점마다 소스가 갈리고, 재설치 한 번으로 다른 버전이 조용히 들어온다.
> 서비스가 쓰는 경로는 `/v/<버전>/` 뿐이다. (호스트로 고정하려던 `puds-vX-Y-Z.vercel.app` 방식은
> Vercel `ssoProtection` 때문에 공개와 고정이 동시에 성립하지 않아 폐기됐다 — 2026-08-26)

```bash
bunx shadcn@latest add @puds/theme-puds          # 토큰 4종 → app/tokens/
bunx shadcn@latest add @puds/card                # 컴포넌트 — 이름은 아래 판별을 통과한 것만
```

- **토큰 재싱크 후 반드시 `--radius-*` → `--puds-radius-*` 리네임을 재적용한다.**
  `app/tokens/{_base,pullim-os,pullim-jr}.css` 3곳. `app/globals.css` 의 `@theme inline` 이
  `--radius-*: var(--puds-radius-*)` 로 별칭하므로 원본 이름 그대로면 자기참조가 된다.

  ⚠️ **로컬 델타는 치환만이 아니다 — 치환 + 그 위에 붙은 3줄 경고 주석이다.** 그 주석 내용이 하필
  「재싱크 후 반드시 다시 적용할 것」이라, sed 만 돌리면 **다음 사람에게 이 단계를 알려 주는 안내가
  조용히 사라진다.** (#214 v0.5.0 업그레이드에서 실제로 만나 손으로 복원했다.)

  아래 A·B 는 **세 파일(`_base`·`pullim-os`·`pullim-jr`)의 로컬 델타를 복원한다** — 2 번이 주석을
  실제로 되붙이고, 4 번의 `diff` 로 확인한다. 검출만 하고 넘어가면 주석은 빠진 채 남는다.

  ⚠️ **`theme-puds` 는 파일 4개를 덮는다. 네 번째인 `_animations.css` 는 복원 대상이 아니다** —
  이 리포에 **로컬 델타가 없어서**(상류 v0.5.0 페이로드와 바이트 동일) 상류 변경을 그대로 받는 것이
  의도이기 때문이다. 그래서 「설치 전 상태로 되돌아간다」가 아니라 **「세 파일의 델타를 되돌린다」**가
  정확한 표현이다. 백업·`diff` 범위는 네 파일 전부로 두었으니, `_animations.css` 가 `diff` 에 뜨면
  그것은 결함이 아니라 **진짜 상류 변경**이다 — 내용을 보고 `globals.css` 가 import 하지 않는다는
  전제(아래 항목)가 여전히 맞는지 확인한다.

**두 덩이로 나뉜다. 한 번에 붙여넣지 마라** — A 는 설치 **전**, B 는 설치 **후**다.
A 를 설치 뒤에 돌리면 백업이 설치본으로 덮여서 복원할 원본이 사라진다.

**A. 설치 전**

```bash
# theme-puds 가 덮는 4개 전부를 뜬다. 복원은 3개만, diff 는 4개 — _animations.css 의 상류 변경도 보이게
cp app/tokens/_base.css app/tokens/pullim-os.css app/tokens/pullim-jr.css app/tokens/_animations.css /tmp/
```

이제 `bunx shadcn@latest add @puds/theme-puds` 를 돌린다.

**B. 설치 후**

> **`sed -i '' …` 를 쓰지 마라.** 빈 인자를 붙이는 형태는 **BSD/macOS 전용**이고, GNU sed 는 `-i` 에
> 접미사를 붙여 쓴다(`-i.bak`). 리눅스에서 `-i ''` 를 주면 빈 문자열이 스크립트로 먹히고 치환식이
> 파일명 자리로 밀려 **즉시 죽는다** — `sed: can't read s/--radius-…: No such file or directory`
> (GNU sed 4.9 실측). 리뷰·CI 가 리눅스라 그 자리에서 절차가 끊긴다.
> 그래서 **치환과 복원을 파이썬 한 블록으로 합쳤다** — 언어가 하나로 줄고 이식성 문제가 사라진다.

```bash
set -e   # 검증이 실패하면 아래 4) 로 넘어가지 않고 여기서 멈춘다

# 1) 치환 + 2) 경고 주석 복원 + 3) 검증 — 한 블록. 재실행해도 안전하다(치환·삽입 둘 다 멱등)
python3 - <<'PY'
import re, sys
DECL   = re.compile(r"--puds-radius-[a-z0-9]+\s*:")   # 선언만. 주석 안의 언급에 걸리면 안 된다
RENAME = re.compile(r"--radius-([a-z0-9]+):")          # 토큰 이름을 열거하지 않는다 — 상류가 늘려도 따라간다
FILES  = ("_base", "pullim-os", "pullim-jr")

for f in FILES:                                        # 1) 치환 + 2) 복원
    cur_p, bak_p = f"app/tokens/{f}.css", f"/tmp/{f}.css"
    cur = RENAME.sub(r"--puds-radius-\1:", open(cur_p, encoding="utf-8").read()).split("\n")
    if any("플래너 로컬 델타" in l for l in cur):
        note = "주석 이미 있음"
    else:
        bak = open(bak_p, encoding="utf-8").read().split("\n")
        i = next(n for n, l in enumerate(bak) if DECL.search(l))   # 백업본의 선언 줄
        j = next(n for n, l in enumerate(cur) if DECL.search(l))   # 설치본의 선언 줄
        cur = cur[:j] + bak[i-3:i] + cur[j:]                       # 그 위 3줄 = 경고 주석
        note = "경고 주석 3줄 복원"
    open(cur_p, "w", encoding="utf-8").write("\n".join(cur))
    print(f"  {f}: 치환 완료 · {note}")

bad = []                                               # 3) 검증 — 디스크에서 다시 읽는다
for f in FILES:                                        #    개수를 세지 않는다. 불변식만 본다
    text  = open(f"app/tokens/{f}.css", encoding="utf-8").read()
    left  = RENAME.findall(text)                       # 치환 안 된 --radius-<이름>: 가 남았는가
    kept  = "플래너 로컬 델타" in text                  # 경고 주석이 있는가
    print(f"  {f}: 미치환 {len(left)}건{' ' + str(left) if left else ''} · 주석 {'있음' if kept else '없음'}")
    if left or not kept: bad.append(f)
print("검증:", "통과" if not bad else f"실패 — {bad}")
sys.exit(1 if bad else 0)
PY

# 4) 4개 전부 비교. _base·pullim-os·pullim-jr 은 델타 복원이 끝났으면 비어야 한다.
#    _animations.css 는 로컬 델타가 없으므로, 여기 뜨면 그게 진짜 상류 변경이다(결함이 아니다)
#    || true — set -e 아래에서 diff 가 차이를 만나면 거기서 루프가 끊겨 나머지 파일을 못 본다
for f in _base pullim-os pullim-jr _animations; do diff -u /tmp/$f.css app/tokens/$f.css || true; done
```

설치 전 상태를 재현해 **A → 설치 → B 를 문서 그대로** 돌려 확인한 출력이다.
**macOS(BSD)와 리눅스(GNU sed 4.9 · Python 3.13) 양쪽에서 같은 출력**을 얻었다 — 리뷰·CI 가 리눅스라
한쪽만 확인하면 의미가 없다:

```
  _base: 치환 완료 · 경고 주석 3줄 복원
  pullim-os: 치환 완료 · 경고 주석 3줄 복원
  pullim-jr: 치환 완료 · 경고 주석 3줄 복원
  _base: 미치환 0건 · 주석 있음
  pullim-os: 미치환 0건 · 주석 있음
  pullim-jr: 미치환 0건 · 주석 있음
검증: 통과
```

> **검증이 개수를 세지 않는 이유.** 예전엔 「선언 7 · 주석 1 · 총 9」를 통과 조건으로 박아 뒀다.
> 그러면 다음 릴리스에서 radius 토큰이 하나 늘거나 줄기만 해도 **정상 재싱크가 실패로 보인다** —
> 바로 위에서 버전 핀을 문서에 복사하지 말라고 한 것과 같은 실수다. 지금은 개수 대신 **불변식**을 본다:
> **치환 안 된 `--radius-<이름>:` 이 0건인가**, **경고 주석이 있는가**. 토큰이 몇 개든 맞는 조건이다.
> 치환 정규식도 이름을 열거하지 않으므로(`--radius-([a-z0-9]+):`) 상류가 `--radius-3xl` 을 추가해도 따라간다.
> (참고 관측값 — 2026-08-31 시점 세 파일 모두 선언 7 · 주석 1. **판정에는 쓰지 마라.**)

4 번의 `diff` 는 **비었다** — 세 파일 모두 설치 전과 바이트 동일이다.
**`diff` 가 비지 않으면 복원이 아직 안 끝난 것이다.** 2 번을 다시 돌려도 안전하다(이미 있으면 건너뛴다).
- **`app/tokens/_animations.css` 는 벤더링만 하고 import 하지 않는다.** `tw-animate-css`(globals.css 에서 import)가
  이미 `animate-in/out` · `fade-*` · `zoom-*` · `slide-in-from-*-N` 을 제공하는 상위집합이다. 둘 다 import 하면
  같은 셀렉터에 규칙이 두 벌 생기고 뒤에 오는 PUDS 쪽(`animation-name: puds-enter`)이 이겨서, `--tw-enter-*` 를
  읽지 못해 현재 쓰이는 `slide-in-from-{right,left,top,bottom}-2`(16곳)의 슬라이드가 죽는다. (2026-08-26 실측)
- `donut.tsx` 는 레지스트리 `target` 이 `components/ui/charts/` 라 `shadcn add` 로 갱신되지 않는다 —
  `components/charts/README.md` 의 `curl` + `cp` 절차를 쓴다.

### ② 로컬 base-ui 프리미티브 — 교체 금지

- ❌ **"엔진이 다르다"는 죽은 근거다 — 쓰지 마라.** 0.4.x 까지는 PUDS 프리미티브가 Radix 였지만
  v0.5.0(2026-08-28)부터 **양쪽 다 `@base-ui/react`** 다. 이 근거로 판단하면 옛 결론에 우연히 닿거나
  (교체 금지) 반대로 뒤집힌다(엔진이 같으니 교체해도 된다) — **둘 다 근거가 틀렸다.**
- ✅ **`files[].target` 이 겹친다 — 11/11.** 레인 ② 11종은 PUDS 쪽 target 이 모두 `components/ui/<name>.tsx` 다.
  `shadcn add` 는 덮어쓰기라, 이 파일들에 쌓아 둔 로컬 수정이 **에러 없이 사라진다.** 살아 있는 위험은 이것이다.
- ✅ **API 가 다르다.** PUDS v0.5.0 `dialog` 는 `Dialog`·`DialogClose`·`DialogContent`·`DialogDescription`·
  `DialogFooter`·`DialogHeader`·`DialogOverlay`·`DialogPortal`·`DialogTitle`·`DialogTrigger` 만 내보낸다 —
  `DialogBody` 가 없고 `DialogContent` 에 `showOverlay` prop 도 없다. 둘 중 하나 이상을 쓰는
  feature 파일이 **7개**(`block-complete-dialog`·`pedagogy-tag`·`welcome-modal`·`activate-confirm-dialog`·
  `delete-confirm-dialog`·`consent-dialog`·`routine-delete-confirm-dialog`)라 덮는 즉시 깨진다.
- `sonner.tsx` 는 PUDS `toast` 와 API 자체가 다르다(Provider+훅 vs `<Toaster/>`+`toast()`). 교체 금지.

**새 PUDS 컴포넌트를 들일지 판단하는 법 — 판별 기준이 바뀌었다.**

> ⛔ **옛 기준(`dependencies` 에 `@radix-ui/*` 가 있으면 도입 불가)은 폐기.** v0.5.0 은 93개 아이템 전부
> Radix·cmdk 의존이 0이라 그 검사는 **아무것도 막지 못한다**(fail-open). 특히 `scroll-area` 는
> `dependencies: ["@base-ui/react"]` 라 옛 기준으로는 "도입 가능"이 나오는데, target 이
> `components/ui/scroll-area.tsx` 라 **레인 ② 파일을 그대로 덮는다.** 정확히 뒤집힌 판정이다.
> (옛 기준이 유효했던 것은 PUDS 0.4.x 까지다.)

**새 기준 — 검사 둘을 병행한다.** `files[].target` 충돌만 보면 판정이 **반대 방향으로 다시 fail-open** 된다.
target 이 안 겹쳐도 이 리포에 없는 패키지를 끌고 오는 아이템이 나올 수 있다.

| | 무엇을 보나 | 통과 못 하면 |
|---|---|---|
| ① **`files[].target` 충돌** | 이 리포의 기존 파일을 덮는가 | 레인 ②·③ 의 로컬 수정이 **에러 없이 사라진다** |
| ② **미설치 의존성** | `dependencies` 에 이 리포에 **없는 패키지**가 있는가 | `package.json` 은 수정 금지 영역 — 설치가 필요하면 별건 승인 사항 |

**둘 다 `registryDependencies` 전이까지 재귀한다.** ② 의 대상은 `@radix-ui/*` 가 아니라
**「`package.json` 의 `dependencies` + `devDependencies` 에 없는 패키지 전부」**다 — 옛 기준을
좁힌 게 아니라 **넓힌** 것이다.

저장소 루트에서 실행한다. **`ITEMS` 에 판정할 이름을 넣는 것 말고는 그대로 복사해 쓴다** —
버전은 `components.json` 에서 읽으므로 핀과 어긋나지 않는다:

```bash
ITEMS="scroll-area data-table"   # ← 판정할 아이템 이름. 공백으로 여러 개
V=$(python3 -c "import json;print(json.load(open('components.json'))['registries']['@puds'].split('/v/')[1].split('/')[0])")
curl -s "https://pullim-design-system.vercel.app/v/$V/registry.json" | python3 -c '
import json,sys,os,re,subprocess
LANE1={"cn","theme-puds","card","badge","input","skeleton"}   # 판별표 레인① — 덮어써도 되는 것
# 레지스트리 target 과 이 리포의 실제 경로가 다른, **이미 아는** 자리. shadcn add 는 target 에
# 새로 쓰므로 실제 파일을 갱신하는 대신 **사본이 하나 더 생긴다**(components/charts/README.md).
# components.json 의 aliases 로는 계산되지 않는다 — ui 별칭이 @/components/ui 인데 실제 경로는
# components/charts/ 라, components/ui/charts/ 에서 charts 를 벗겨내는 규칙이 없다. 그래서 손으로 적는다.
# 이 목록이 낡아도 조용히 통과하지 않게, 아래에서 **같은 이름 파일을 자동으로 찾아** 판정 불가로 떨어뜨린다.
VENDORED_AS={"components/ui/charts/donut.tsx": "components/charts/donut.tsx"}
# 추적 파일의 basename 색인 — target 은 없는데 같은 이름 파일이 딴 데 있으면 사람이 봐야 한다
BY_BASE={}
for _p in subprocess.run(["git","ls-files"],capture_output=True,text=True).stdout.split("\n"):
    if _p: BY_BASE.setdefault(os.path.basename(_p),[]).append(_p)
pkg=json.load(open("package.json")); have=set(pkg.get("dependencies",{}))|set(pkg.get("devDependencies",{}))
items={i["name"]:i for i in json.load(sys.stdin)["items"]}
def pkg_name(dep): return re.sub(r"(?<!^)@[^@/]*$","",dep)   # "pkg@^1.2.3" -> "pkg"

def resolve(root):
    """root 에서 registryDependencies 를 따라간다. 전역 상태 없음 — 호출마다 새로 만든다.
       반환: (도달한 아이템 이름, 이름을 얻지 못한 표기).
       못 얻은 것은 조용히 건너뛰지 않는다 — 건너뛰면 fail-open 이다."""
    reached, unresolved, todo = set(), set(), [root]
    while todo:
        n = todo.pop()
        if n in reached: continue
        if n not in items: unresolved.add(n); continue      # 인덱스에 없는 이름(rename·불일치)
        reached.add(n)
        for rd in items[n].get("registryDependencies") or []:
            if   rd.startswith("@puds/"): todo.append(rd.split("/",1)[1])
            elif "://" in rd:             unresolved.add(rd)   # URL 은 이름을 얻을 수 없다
            else:                         todo.append(rd)      # bare item name
    return reached, unresolved

for name in sys.argv[1:]:
    print(f"@puds/{name}:")
    reached, unresolved = resolve(name)                      # ← 아이템마다 새 값. 앞 결과가 안 섞인다
    blocked = False; review = False
    for n in sorted(reached):                                # ① target 충돌
        for f in items[n].get("files") or []:
            t=f["target"]; via="" if n==name else f"  <- @puds/{n}"
            here=VENDORED_AS.get(t)
            if here and os.path.exists(here):                # 아는 자리 — 덮지 않고 사본이 는다
                print(f"  ⛔ 사본 생성  {t}  (이 리포는 {here} 로 관리){via}"); blocked=True; continue
            if not os.path.exists(t):
                same=[q for q in BY_BASE.get(os.path.basename(t),[]) if q!=t]
                if same:                                     # VENDORED_AS 가 낡았거나 이름이 겹친다
                    print(f"  ⛔ 같은 이름 파일 {t}  (리포에 " + ", ".join(same) + f"){via}")
                    review=True; continue                    # → 판정 불가. 사람이 본다
                mark="신규      "
            elif n in LANE1:          mark="레인① 재설치"
            else:                     mark="⛔ 덮어씀   "; blocked=True
            print(f"  {mark} {t}{via}")
    for n in sorted(reached):                                # ② 미설치 의존성
        for dep in items[n].get("dependencies") or []:
            if pkg_name(dep) not in have:
                print(f"  ⛔ 미설치 의존성 {dep}" + ("" if n==name else f"  <- @puds/{n}")); blocked=True
    for u in sorted(unresolved):                             # ③ 해석 불가 → 통과시키지 않는다
        print(f"  ⛔ 해석 불가 {u}")
    print("  ->", "도입 불가" if blocked else "판정 불가 — 손으로 확인할 것" if unresolved or review else "도입 가능")
' $ITEMS
```

> ⚠️ **`<name>` 같은 꺾쇠 자리표시자를 명령 끝에 쓰지 마라.** 셸이 `<` 를 **입력 리다이렉션**으로
> 삼켜서 인자가 전달되지 않고 명령 자체가 죽는다 — `bash: name: No such file or directory`
> (zsh·dash 도 같은 형태로 실패한다). 출력이 안 나오는 게 아니라 **아무것도 실행되지 않는다.**
> 자리표시자가 필요하면 위처럼 **셸 변수**로 둔다.

판정은 **세 갈래**다. 「모르겠다」를 「괜찮다」로 접지 않기 위해서다:

| 판정 | 뜻 | 할 일 |
|---|---|---|
| `도입 가능` | 두 검사 다 통과 | 들여도 된다. 그다음 판단은 API 중복 여부 — 같은 역할의 레인 ②/③ 컴포넌트가 이미 있으면 이름만 다른 두 벌이 생긴다 |
| `도입 불가` | target 을 덮거나, **경로가 달라 사본이 하나 더 생기거나**(`donut`), 미설치 의존성이 있다 | 들이지 않는다 |
| `판정 불가` | `registryDependencies` 의 이름을 얻지 못했거나(레지스트리에 없는 이름, URL 표기), **target 은 비었는데 같은 이름 파일이 리포 딴 데 있다** | **통과가 아니다.** 손으로 확인한다 |

> **왜 「판정 불가」를 따로 두나.** 이 판별기의 실패 모드는 fail-open 이다 — 전이를 놓치면
> 조용히 `도입 가능` 이 나온다. 이름을 못 얻은 것을 건너뛰면 정확히 그 일이 벌어진다.
> `resolve()` 는 못 얻은 표기를 **모아서 돌려주고**, 하나라도 있으면 통과시키지 않는다.

> **스크립트가 전역 상태를 안 쓰는 이유.** `resolve()` 는 호출마다 새 값을 만들어 돌려준다.
> 예전엔 해석 불가 목록이 함수 바깥에 있어서, `ITEMS` 에 여러 이름을 넣으면 **앞 아이템의
> 해석 불가가 뒤 아이템 판정에 그대로 남아** 멀쩡한 아이템이 거짓으로 막혔다.
> 전역이 없으면 그 버그가 **구조적으로 생길 수 없다.**

**두 검사가 서로를 대신하지 못한다** — v0.5.0 이 양쪽 사례를 다 갖고 있다:

```
@puds/scroll-area:
  레인① 재설치 lib/cn.ts  <- @puds/cn
  ⛔ 덮어씀    components/ui/scroll-area.tsx
  -> 도입 불가                                  ← ① 만 잡는다. dependencies 는 깨끗하다

@puds/data-table:
  신규       components/ui/checkbox.tsx  <- @puds/checkbox
  레인① 재설치 lib/cn.ts  <- @puds/cn
  신규       components/ui/data-table.tsx
  ⛔ 미설치 의존성 @tanstack/react-table
  -> 도입 불가                                  ← ② 만 잡는다. target 은 전부 신규다
```

**전량 스윕 — PUDS v0.5.0 기준 (2026-08-31 실측)**

아래 수치는 **작성 시점에 고정돼 있던 릴리스(v0.5.0)를 실제로 훑은 값**이다. 핀이 올라가면 낡는다 —
숫자를 믿지 말고 위 스크립트를 다시 돌려라. 표는 "두 검사가 각각 무엇을 잡는가"를 보여 주려고 남긴다.

**①은 두 갈래다 — 같은 「경로 문제」지만 사후 증상이 다르다.** 덮어씀은 **기존 파일이 사라지고**,
사본 생성은 **기존 파일은 남고 중복본이 는다.** 나중에 무엇을 찾아야 하는지가 달라서 나눠 적는다.

| 버킷 | 개수 | |
|---|---|---|
| **전체 아이템** | **93** | |
| ① 덮어씀 | **17** | 직접 11(`avatar`·`button`·`dialog`·`dropdown-menu`·`label`·`progress`·`scroll-area`·`separator`·`sheet`·`tabs`·`tooltip` — 전부 `components/ui/<name>.tsx`) + **전이 6**(`auth-card`·`date-picker`·`hero`→`button`, `avatar-group`→`avatar`, `combobox`·`command`→`dialog`) |
| ① 사본 생성 | **1** | `donut` — target 이 `components/ui/charts/` 인데 이 리포는 `components/charts/` (`VENDORED_AS` 가 아는 자리) |
| ① 같은 이름 파일 | **6** | `app-shell`·`breadcrumb`·`empty-state`·`heatmap`·`page-header`·`service-switcher` — target 은 비었는데 같은 이름 파일이 딴 데 있다 → **판정 불가** |
| ② 미설치 의존성 | **1** | `data-table` (`@tanstack/react-table`) |
| 둘 다 통과 | **68** | 레인 ① 6종 포함 — 그 6종은 재설치가 정상이다 |
| | **= 93** | 판정으로는 `도입 불가` 19 · `판정 불가` 6 · `도입 가능` 68 |
| 참고: `dependencies` 에 `@radix-ui/*` 또는 `cmdk` | **0** | ← 옛 기준이 죽은 이유 |

네 버킷은 서로 겹치지 않는다(한 아이템이 두 사유로 걸리는 경우가 없다). 재현:

```bash
ITEMS=$(jq -r '.items[].name' <(curl -s "https://pullim-design-system.vercel.app/v/$V/registry.json") | tr '\n' ' ')
# 위 판별 스크립트를 이 ITEMS 로 돌리고 '->' 줄을 세면 도입 가능 74 · 도입 불가 19 가 나온다
```

v0.5.0 이 요구하는 npm 패키지는 `@base-ui/react` · `@tanstack/react-table` ·
`class-variance-authority` · `clsx` · `recharts` · `tailwind-merge` 6종이고,
이 중 `@tanstack/react-table` 만 이 리포에 없다.

**`donut` 은 덮지 않는 대신 사본이 는다 — 그래서 통과시키지 않는다.** target 이
`components/ui/charts/donut.tsx` 인데 이 리포는 `components/charts/donut.tsx` 로 관리한다.
target 경로에는 파일이 없으니 순진하게 보면 `신규` 로 분류되어 **`도입 가능` 이 나온다** —
실제로는 새 도입이 아니라 **중복 사본 생성**인데도. 스크립트의 `VENDORED_AS` 가 이 자리를 막는다:

```
@puds/donut:
  레인① 재설치 lib/cn.ts  <- @puds/cn
  ⛔ 사본 생성  components/ui/charts/donut.tsx  (이 리포는 components/charts/donut.tsx 로 관리)
  -> 도입 불가
```

갱신은 `shadcn add` 가 아니라 `components/charts/README.md` 의 `curl` + `cp` 절차로 한다.
`components.json` 의 `aliases` 로는 이 매핑이 계산되지 않아(`ui` 별칭이 `@/components/ui` 인데
실제 경로는 `components/charts/`) 손으로 적었고, 그 이유를 스크립트 주석에 남겼다.

> **`VENDORED_AS` 는 수동 목록이라 그것만으로는 fail-open 이 남는다.** 앞으로 레지스트리에 다른
> 경로 불일치가 생기면 목록에 없으니 `신규` 로 보고 `도입 가능` 까지 내려간다. 그래서 **자동 가드**를
> 함께 뒀다 — target 이 비어 있는데 **같은 이름 파일이 리포 어딘가에 있으면 `판정 불가`** 로 떨어뜨린다.
> 목록이 낡아도 조용히 통과하지 않는다.
>
> v0.5.0 에서 이 가드에 걸리는 6종(`app-shell`·`breadcrumb`·`empty-state`·`heatmap`·`page-header`·
> `service-switcher`)은 대부분 **이름만 겹치는 서비스 고유 컴포넌트**다. 그래도 통과시키지 않는 이유는,
> 들이면 **같은 이름의 컴포넌트가 두 벌** 생기기 때문이다 — 그게 의도인지는 사람이 정할 일이다.
> `VENDORED_AS` 는 **결과가 확정된 자리**(`donut`)에만 쓴다. 새 경로 불일치를 확인했으면 목록에 추가한다.

### 버전 업그레이드 절차

1. `components.json` 의 `@puds` URL 에서 **경로의 버전만** 교체 — `/v/<이전>/` → `/v/<새 버전>/`
   (호스트는 그대로. 가용 버전은 PUDS 저장소 `docs/releases.md` 표 참조)
2. 레인 ① 아이템을 재설치 (`theme-puds` + 도입한 컴포넌트) · `donut` 은 `curl`+`cp`
   — `components/charts/README.md` 의 URL 도 같은 버전으로 맞춘다
3. `--puds-radius-*` 리네임 **+ 3줄 경고 주석** 재적용 — 위 § ① 의 0~4 단계.
   **sed 만 돌리면 주석이 사라진다**(#214 에서 실제로 겪었다). `grep -c '플래너 로컬 델타'` 가 세 파일 모두 1 이어야 한다
4. **`git diff` 리뷰** — 벤더링이라 재설치는 로컬 수정을 덮어쓴다. 의도치 않은 값 변화가 없는지 본다
5. `bun run typecheck` · `bun run test` · `bun run build` · **라이트/다크 양쪽 실 렌더 확인** — 1차 근거는 이것이다
   - **보조 지표**로 산출 CSS 해시를 맞대 볼 수 있다: base 와 브랜치에서 각각 `rm -rf .next && bun run build`
     후 `.next` 의 CSS 를 이어붙여 `shasum -a 256` (#214 에서 쓴 방법)
   - ⚠️ **해시 동일은 "스타일 산출물이 같다"까지만 말한다.** 마크업 구조·`aria-*`·포커스 이동·오버레이
     동작의 회귀는 **CSS 가 완전히 같아도 난다.** 실 렌더·상호작용 확인을 **대체하지 못한다** —
     하필 이 문서가 다루는 변화(프리미티브·DOM 계층 교체)가 정확히 그 사각지대다
   - 해시가 강한 근거가 되는 경우는 **레인 ① 소스 변화가 0 인 핀 업그레이드**뿐이다(#214 가 그랬다).
     레인 ②·③ 이나 DOM 이 바뀌는 변경에 이 논리를 일반화하지 마라

### 그 외

```
lucide-react            ← 아이콘 (직접 import 허용)
sonner                  ← toast (직접 import 허용)
@base-ui/react          ← 프리미티브 엔진
```

- `cn` 은 `@/lib/cn`(PUDS 벤더링 원본) 또는 `@/lib/utils`(재export) 어느 쪽이든 동작한다.
  PUDS 컴포넌트는 원본 그대로 `@/lib/cn` 을 쓰고, 기존/신규 서비스 코드는 `@/lib/utils` 를 계속 쓴다.
- 상류 shadcn 컴포넌트가 필요하면 `bunx shadcn@latest add <name>` (레인 ②로 들어온다)

## 테마 — 성격 축과 명암 축은 별개다

| 속성 | 값 | 정하는 것 | 배선 |
|---|---|---|---|
| `data-theme` | `pullim-os` | 라운드·모션·그림자 | `app/layout.tsx` 가 고정 |
| `data-scheme` | `light`(기본) · `dark` | 표면·글자·경계 | `components/shell/theme-provider.tsx` (next-themes) |

- **다크를 `data-theme="dark"` 로 지정하면 성격 슬롯을 뺏어 테마가 통째로 풀린다.** 반드시 `data-scheme`.
- 컴포넌트에 `dark:` 유틸리티를 새로 쓰지 마라 — 의미 토큰(`bg-card`·`text-foreground`·`border-border`)만
  참조하면 명암이 자동으로 따라온다. (`dark:` 는 `[data-scheme="dark"]` 에 물려 있긴 하다)
- 레거시 `pullim-slate-*` / `pullim-*-bg` 램프는 `app/globals.css` 의 `--pl-*` 우회 변수를 거쳐
  `[data-scheme="dark"]` 에서 반전된다. **`@theme inline` 에서 `--color-gray-*` 를 직접 가리키지 마라** —
  값이 유틸리티에 인라인돼 버려 뒤집을 수 없게 된다.
- **다크 기본값은 `light`.** 브랜드 램프(`pullim-blue-*`, 약 370곳)가 아직 명암을 따라가지 않아
  `text-pullim-blue-700`(98곳)이 다크에서 대비 2.5:1 이고 `bg-pullim-blue-50`(72곳)이 밝은 블록으로 남는다.
  이 램프를 의미 토큰으로 옮기는 것이 다크를 기본으로 켜기 전 남은 작업이다.

## i18n — 미도입

- 사용자 노출 텍스트 **한국어 하드코딩** 허용 (next-intl 미설치)
- `useTranslations()` 패턴 도입 금지 (별 트랙)

## 관측 / 분석

- **Sentry 미설치** — `@sentry/*` import 금지
- **`@pullim/analytics`, `@pullim/remote-config` 미설치** — import 금지
- **`@vercel/analytics` 도입 완료** — `app/layout.tsx` 의 `<Analytics />`, `track()` 호출 패턴 허용
- 에러는 `console.error` 또는 `toast.error` 로만 처리

## 데이터 레이어 — pullim-api (쿠키 SSO) + mock 잔존

- 세션/로그인: `lib/auth/auth-context.tsx` → `pullimSession`(`lib/auth/pullim-session-client.ts`) → pullim-api `/auth/*`, `/planner/me`
- planner 데이터: `lib/planner/client.ts`(re-export) → `lib/planner/pullim-client.ts` → pullim-api `/planner/*`
- fetch 래퍼: `lib/api-client/` (cookie-http + CSRF, 401 시 세션 만료 전파)
- 화면 상당수는 아직 `lib/mock/*` 폴백 — dev bypass(`NEXT_PUBLIC_DEV_AUTH_BYPASS=1` + localhost)에서는 mock 으로 렌더
- 자체 NestJS BE(구 apps/backend)와 Bearer 클라이언트는 **2026-07-31 폐기 완료** — `fetch("/api/...")` 직접 호출 금지, 새 엔드포인트는 pullim-api 에 추가

## Container/Presenter 패턴

```
components/features/<도메인>/
├── containers/     ← 상태, 핸들러, fetch/mock 호출. "use client"
├── presenters/     ← 순수 렌더링. props만 받음
├── components/     ← 도메인 내부 재사용 UI
├── hooks/          ← 도메인 hook (선택)
└── types.ts        ← 공유 타입 (선택)
```

- `app/(student)/.../page.tsx` 는 Container만 import + Suspense 래핑
  - **예외 — thin redirect/래퍼 페이지** (~20줄 이하): `/planner/calendar`, `/planner/day`, `/planner/week`, `/planner/month`, `/planner/builder` 등
- Container에서 `useState`/`useCallback`/`useRouter` 사용
- Presenter / 하위 컴포넌트에서 API 호출 / 라우팅 hook 사용 금지 (간단한 UI 상태 useState 는 허용)

### cross-feature import 정책
- feature A의 widget을 feature B에서 import 허용 (widget 소유권이 한쪽에 명확할 때)
- 양방향 의존 금지 (feature 그래프가 사이클 없도록)
- 빌려오는 쪽은 widget을 **있는 그대로** 사용 (감싸서 동작 변경 금지)
- 진짜 순수 프리젠테이션(state·router·side effect·도메인 계산 없음)만 `components/shared/` 승격 — 표시값은 전부 props 주입, 도메인 계산은 `lib/planner/*` helper 로

## 스타일링

- Tailwind CSS v4 만 사용 (인라인 style 금지)
- 모바일 우선 반응형: 기본 → `md:` → `lg:`
- shadcn semantic 토큰 우선: `text-foreground`, `bg-background`, `border-border`
- 교육 서비스 특성상 **촘촘한 UI 권장**, 과도한 여백 지양

## 수정 금지 영역 (사용자 명시 확인 필요)

| 경로 | 이유 |
|---|---|
| `lib/hooks/` | 개발자 전용 |
| `package.json` | 의존성 변경 |
| `next.config.ts` · `tsconfig.json` | 설정 변경 |
| `.github/workflows/**` | CI/Codex Review 자동화 |
| 이 가이드 / AGENTS.md / README.md | 컨벤션 변경은 별도 작업으로 |

## 명령어

| 작업 | 명령 |
|---|---|
| 의존성 설치 | `bun install` |
| dev (port 3006) | `bun run dev` |
| build (standalone) | `bun run build` |
| typecheck | `bun run typecheck` |
| lint | `bun run lint` |
| test (Jest) | `bun run test` |

환경변수는 리포 루트 `.env.local` (템플릿: `.env.example`). 로컬 SSO 값은 런북 참조.

## Orchestration 체크리스트 (작업 마치기 전)

1. **`components/shell/nav-config.ts`** — `plannerSection` 안 href가 실제 라우트와 일치하는지
2. **`input/docs-archive/08_풀림_플래너_핸드오프.md`** — 권위 문서의 IA·용어와 코드가 어긋나지 않는지
3. **`lib/mock/planner.ts`** — 시간표·블록·컨디션·번아웃 등 시그니처 데이터 구조 일관성 (pullim-api 계약과 정합)
4. **커밋 전**: `bun run typecheck` · `bun run lint` · `bun run test` 통과
5. **Codex Review 통과** — PR 머지 전 필수
