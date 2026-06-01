import { TransformFnParams } from "class-transformer";
import { DateTime } from "luxon";
import { ValueTransformer } from "typeorm";
import { DEFAULT_TIMEZONE } from "../../config/timezone.config";

export const DateTimeTransformer: ValueTransformer = {
  to(value: DateTime | null | undefined): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return value.toJSDate();
  },
  from(value: Date | null): DateTime | null {
    if (!value) return null;
    return DateTime.fromJSDate(value, { zone: DEFAULT_TIMEZONE });
  },
};

/**
 * Luxon DateTime 값을 ISO 문자열로 변환한다. class-transformer의 @Transform에서 사용한다.
 * @param params - class-transformer의 변환 함수 파라미터
 * @returns ISO 형식 문자열 또는 null
 */
export function dateTimeToIso(params: TransformFnParams): string | null {
  const value = params.value as DateTime | null;
  if (!value) return null;
  return value.toISO();
}

/**
 * 현재 시각을 KST(`Asia/Seoul`) zone DateTime으로 반환한다.
 * @returns KST zone DateTime
 */
export function nowKst(): DateTime {
  return DateTime.now().setZone(DEFAULT_TIMEZONE);
}
