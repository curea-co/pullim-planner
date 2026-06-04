import { IsBooleanString, IsOptional } from "class-validator";

/** `GET /api/planners` 쿼리 — `?includeArchived=true` 면 archived 포함(기본 제외). */
export class PlannersQueryDto {
  @IsOptional()
  @IsBooleanString({ message: "includeArchived 는 true/false 여야 합니다." })
  includeArchived?: string;
}
