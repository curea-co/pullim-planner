# components/charts

PUDS 디자인 시스템 차트를 **vendoring**(복사)해 쓰는 자리. shadcn 프리미티브(`components/ui/*`)와 구분된다.

## ⚠️ 차트 추가 가드 (ADR · 2026-06-25)

> **2번째 차트를 추가하기 전에 차트 시스템 표준을 먼저 정한다.**

- **현재**: recharts(`weekly-chart` 등 기존) + PUDS SVG(`donut`) **혼재**. 차트가 사실상 1개라 **아직 부채 아님**.
- **트리거**: 차트를 더 vendoring/추가하는 순간 → **recharts vs PUDS-SVG 중 표준 하나**를 정하고 이 파일에 1줄 기록.
- **이유**: 표준 없이 하나씩 추가하면 chart-token 중복·업스트림 드리프트·일관성 붕괴(= 기술 부채)가 누적된다.

## vendoring 절차 (donut 기준)

1. `pullim-design-system/packages/ui/charts/<name>.tsx` 를 복사
2. `@/lib/cn` → `@/lib/utils`
3. `--chart-cat-*`(플래너 미정의) 색 → 플래너 PUDS 토큰(`--color-primary-*`·`--color-gray-*` 등)으로 폴백 교체
