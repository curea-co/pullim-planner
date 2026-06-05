import { Type } from "class-transformer";
import {
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

/** `customization: { layoutId, weekLayoutId?, paletteId }` 본문. */
class CustomizationBody {
  @IsString()
  @IsNotEmpty()
  layoutId: string;

  @IsOptional()
  @IsString()
  weekLayoutId?: string;

  @IsString()
  @IsNotEmpty()
  paletteId: string;
}

/** `PUT /api/planners/:id/customization` — 시간표 꾸미기 저장 요청. */
export class CustomizationDto {
  // `@IsDefined()` 로 객체 누락 시 422 보장 — `{}` 가 통과해 컨트롤러에서 undefined 가
  // 캐스팅돼 내려가는 것을 막는다 (codex).
  @IsDefined({ message: "customization 을 입력해주세요." })
  @ValidateNested()
  @Type(() => CustomizationBody)
  customization: CustomizationBody;
}
