import {
  registerDecorator,
  IsOptional,
  type ValidationOptions,
} from "class-validator";
import { DateTime } from "luxon";

/**
 * `YYYY-MM-DD` 형식 + **실제 달력 날짜** 검증. 정규식만으로는 `2026-13-99`·`2026-02-31`
 * 같은 존재하지 않는 날짜가 통과하므로 luxon 으로 유효성까지 확인한다.
 */
function IsIsoCalendarDate(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isIsoCalendarDate",
      target: object.constructor,
      propertyName,
      options: options,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== "string") return false;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
          return DateTime.fromISO(value).isValid;
        },
      },
    });
  };
}

/** `GET /api/planners/:id/blocks` 쿼리 — `?date=YYYY-MM-DD`(기본: KST 오늘). */
export class BlocksQueryDto {
  @IsOptional()
  @IsIsoCalendarDate({
    message: "date 는 유효한 YYYY-MM-DD 날짜여야 합니다.",
  })
  date?: string;
}
