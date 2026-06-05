/**
 * 시간표 꾸미기 허용 ID 목록 — FE 토큰(`apps/planner/lib/tokens/*`)의 order 배열과 1:1.
 *
 * 잘못된 id 가 저장되면 FE 가 `palettes[paletteId].block` / `layoutTemplates[layoutId]`
 * 처럼 키로 바로 접근하다 `undefined` 런타임 에러로 화면이 터진다 (codex). 그래서 서버에서
 * 허용 목록으로 검증한다. FE 토큰이 늘면 이 목록도 같이 갱신해야 한다(작고 안정적인 enum).
 */
export const LAYOUT_IDS = [
  "vertical_timeline",
  "checklist",
  "block_cards",
  "pie_list",
] as const;

export const WEEK_LAYOUT_IDS = [
  "matrix_by_type",
  "school_grid",
  "bar_week",
  "heatmap",
] as const;

export const PALETTE_IDS = [
  "pullim_blue",
  "forest",
  "sunset",
  "pastel",
  "mono",
  "mint",
  "rose",
] as const;
