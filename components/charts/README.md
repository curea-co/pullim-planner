# components/charts

PUDS 디자인 시스템 차트를 **vendoring**(복사)해 쓰는 자리. 로컬 base-ui 프리미티브(`components/ui/*`)와 구분된다.
레인 구분과 전체 규칙은 `CLAUDE.md § UI 컴포넌트`.

## ⚠️ 차트 추가 가드 (ADR · 2026-06-25)

> **2번째 차트를 추가하기 전에 차트 시스템 표준을 먼저 정한다.**

- **현재**: recharts(`weekly-chart` 등 기존) + PUDS SVG(`donut`) **혼재**. 차트가 사실상 1개라 **아직 부채 아님**.
- **트리거**: 차트를 더 vendoring/추가하는 순간 → **recharts vs PUDS-SVG 중 표준 하나**를 정하고 이 파일에 1줄 기록.
- **이유**: 표준 없이 하나씩 추가하면 chart-token 중복·업스트림 드리프트·일관성 붕괴(= 기술 부채)가 누적된다.

## vendoring 절차 (donut 기준) · 개정 2026-08-27

**`donut.tsx` 는 PUDS v0.4.2 레지스트리와 바이트 단위로 동일하다. 로컬 델타 0.**
따라서 드리프트 점검이 곧 `diff` 다:

```bash
# 1) 버전 고정 URL 에서 원본을 받는다.
#    ⚠ 경로의 버전(/v/0.4.2/)이 components.json 의 @puds 와 반드시 같아야 한다.
#    ⚠ /r/donut.json 은 항상 main 최신이라 여기서 쓰면 안 된다 — 시점이 갈린다.
curl -s https://pullim-design-system.vercel.app/v/0.4.2/donut.json \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['files'][0]['content'],end='')" \
  > /tmp/donut-upstream.tsx

# 2) diff 가 비면 최신
diff -u components/charts/donut.tsx /tmp/donut-upstream.tsx

# 3) 갱신은 그냥 덮어쓰기 (맞출 게 없다)
cp /tmp/donut-upstream.tsx components/charts/donut.tsx
```

버전을 올릴 때는 `components.json` 과 위 URL 의 `/v/<버전>/` 을 **함께** 바꾼다.

### ❌ `shadcn add @puds/donut` 을 쓰지 말 것

레지스트리 아이템의 `target` 이 `components/ui/charts/donut.tsx` 라서, 실행하면 **여기 있는 파일을 갱신하는 대신
`components/ui/charts/` 에 사본을 하나 더 만든다.** 위의 `curl` + `cp` 로 받는다.

### 로컬 델타 3건이 사라진 경위 (2026-08-26)

| 과거 델타 | 처리 |
|---|---|
| `@/lib/cn` → `@/lib/utils` | `@puds/cn` 설치로 `lib/cn.ts` 가 생겨 원본 import 가 그대로 해석된다 |
| `--chart-cat-1..8` → `--color-primary-*` 폴백 | `--chart-cat-*` 은 `app/tokens/_base.css` 에 처음부터 있었다(폴백 근거 불성립). 유일한 호출부 `features/planner-reports/components/weekly-summary.tsx` 도 세그먼트 색을 명시로 넘기므로 화면 변화 없음 |
| `rounded-[var(--radius-full)]` → `rounded-full` | `--radius-full` 을 `app/globals.css` 의 `:root` 에서 커스텀 프로퍼티로 내보내 원본 표기가 그대로 동작 |
