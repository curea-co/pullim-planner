import { Type } from "class-transformer";
import { IsDefined, IsIn, IsOptional, ValidateNested } from "class-validator";

import {
  LAYOUT_IDS,
  PALETTE_IDS,
  WEEK_LAYOUT_IDS,
} from "./customization-options.constant";
import { IsPlainObject } from "./is-plain-object.validator";

/** `customization: { layoutId, weekLayoutId?, paletteId }` 본문. */
class CustomizationBody {
  // 허용 ID 만 — 잘못된 값이 FE 렌더 경로에서 undefined 접근 크래시를 내는 것 방지 (codex).
  @IsIn(LAYOUT_IDS, { message: "layoutId 가 허용된 값이 아닙니다." })
  layoutId: string;

  @IsOptional()
  @IsIn(WEEK_LAYOUT_IDS, { message: "weekLayoutId 가 허용된 값이 아닙니다." })
  weekLayoutId?: string;

  @IsIn(PALETTE_IDS, { message: "paletteId 가 허용된 값이 아닙니다." })
  paletteId: string;
}

/** `PUT /api/planners/:id/customization` — 시간표 꾸미기 저장 요청. */
export class CustomizationDto {
  // `@IsDefined()` 로 객체 누락 시 422 보장 — `{}` 가 통과해 컨트롤러에서 undefined 가
  // 캐스팅돼 내려가는 것을 막는다 (codex).
  @IsDefined({ message: "customization 을 입력해주세요." })
  @IsPlainObject({ message: "customization 은 객체여야 합니다." })
  @ValidateNested()
  @Type(() => CustomizationBody)
  customization: CustomizationBody;
}
