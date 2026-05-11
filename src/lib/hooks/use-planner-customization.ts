/**
 * 플래너 꾸미기 커스터마이즈 — 활성/특정 플래너의 layoutId + paletteId 조회.
 *
 * mock 데이터가 reactive하지 않으므로 hook이 아닌 단순 lookup 함수로 제공한다.
 * (manage 페이지의 `setTick`처럼 변경 후 강제 re-render는 호출자가 담당)
 */

import {
  findPlanner,
  getActivePlanner,
  defaultLayoutId,
  defaultPaletteId,
  type Planner,
  type LayoutTemplateId,
  type PaletteId,
} from '@/lib/mock';

export type Customization = {
  layoutId: LayoutTemplateId;
  paletteId: PaletteId;
};

export function getCustomization(planner: Planner | null | undefined): Customization {
  return {
    layoutId: planner?.customization?.layoutId ?? defaultLayoutId,
    paletteId: planner?.customization?.paletteId ?? defaultPaletteId,
  };
}

/** 활성 플래너의 customization. 없으면 디폴트. */
export function getActiveCustomization(): Customization {
  try {
    return getCustomization(getActivePlanner());
  } catch {
    return getCustomization(null);
  }
}

/** 특정 플래너의 customization. 못 찾으면 디폴트. */
export function getCustomizationFor(plannerId: string): Customization {
  return getCustomization(findPlanner(plannerId));
}
