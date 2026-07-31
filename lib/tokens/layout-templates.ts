/**
 * 시간표 꾸미기 — 일간 레이아웃 템플릿 4종.
 *
 * 공스타그램(한국 학습 인스타그램) 50장 분석 기반의 시각 레이아웃 변형.
 * 모두 동일한 `TimeBlock[]` 데이터를 다른 방식으로 그려낸다.
 *
 * 적용 범위(MVP): 일간 뷰만. 주간/월간 뷰는 템플릿과 독립적으로 동작.
 * 추후 확장: 격자 시간표(학교 시간표), 캘린더 위클리, 핸드라이팅 변형 등.
 */

export type LayoutTemplateId =
  | 'vertical_timeline'
  | 'checklist'
  | 'block_cards'
  | 'pie_list';

export type LayoutTemplateMeta = {
  id: LayoutTemplateId;
  label: string;
  description: string;
  /** 한 글자 시각 아이콘 (썸네일 대용) */
  glyph: string;
};

export const layoutTemplates: Record<LayoutTemplateId, LayoutTemplateMeta> = {
  vertical_timeline: {
    id: 'vertical_timeline',
    label: '세로 타임라인',
    description: '좌측 시간축 + 우측 색 블록. 공스타그램 클래식.',
    glyph: '▤',
  },
  checklist: {
    id: 'checklist',
    label: '체크리스트',
    description: '시간·활동 줄 + 좌측 색 점 + 체크박스. 다이어리 느낌.',
    glyph: '☑',
  },
  block_cards: {
    id: 'block_cards',
    label: '블록 카드',
    description: '시간 비율 무시, 일정마다 큰 카드. 노션·트렐로 느낌.',
    glyph: '▦',
  },
  pie_list: {
    id: 'pie_list',
    label: '파이 + 리스트',
    description: '상단 도넛 차트 + 하단 컴팩트 리스트. 통계 요약형.',
    glyph: '◐',
  },
};

export const defaultLayoutId: LayoutTemplateId = 'vertical_timeline';

export const layoutOrder: LayoutTemplateId[] = [
  'vertical_timeline', 'checklist', 'block_cards', 'pie_list',
];
