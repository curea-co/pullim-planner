import { Type } from "class-transformer";
import {
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
  @ValidateNested()
  @Type(() => CustomizationBody)
  customization: CustomizationBody;
}
