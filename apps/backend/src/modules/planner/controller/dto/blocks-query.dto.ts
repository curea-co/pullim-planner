import { IsOptional, Matches } from "class-validator";

/** `GET /api/planners/:id/blocks` 쿼리 — `?date=YYYY-MM-DD`(기본: 오늘). */
export class BlocksQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "date 는 YYYY-MM-DD 형식이어야 합니다.",
  })
  date?: string;
}
