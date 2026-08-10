/**
 * 시간표 꾸미기 — 주간 레이아웃 템플릿 4종.
 *
 * 일간 4종(`layout-templates.ts`)과 동일한 패턴.
 * 일간/주간은 *독립적으로* 선택되며, 한 플래너가 양쪽 모두 customization 보유.
 */

export type WeekLayoutId =
  | 'matrix_by_type'
  | 'school_grid'
  | 'bar_week'
  | 'heatmap';

export type WeekLayoutMeta = {
  id: WeekLayoutId;
  label: string;
  description: string;
  /** 컨트롤 카드 미니 아이콘 (썸네일 대용) */
  glyph: string;
};

export const weekLayouts: Record<WeekLayoutId, WeekLayoutMeta> = {
  matrix_by_type: {
    id: 'matrix_by_type',
    label: '블록 타입×요일 표',
    description: '행=블록 타입, 열=요일, 칸=학습 시간 막대. 풀림 기본형.',
    glyph: '▦',
  },
  school_grid: {
    id: 'school_grid',
    label: '학교형 교시×요일',
    description: '1~9교시 × 월~일 표. 칸마다 과목명. 종이 시간표 느낌.',
    glyph: '🏫',
  },
  bar_week: {
    id: 'bar_week',
    label: '요일별 막대',
    description: '7일 × 총 학습 시간 막대. 요일별 공부량을 간단히 비교해요.',
    glyph: '📊',
  },
  heatmap: {
    id: 'heatmap',
    label: '시간×요일 학습 캘린더',
    description: '2시간 칸 × 요일. 칸 색이 진할수록 많이 공부한 시간. 언제 얼마나를 한눈에.',
    glyph: '🔥',
  },
};

export const defaultWeekLayoutId: WeekLayoutId = 'matrix_by_type';

export const weekLayoutOrder: WeekLayoutId[] = [
  'matrix_by_type', 'school_grid', 'bar_week', 'heatmap',
];
