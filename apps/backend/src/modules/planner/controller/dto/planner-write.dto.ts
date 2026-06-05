import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";

/**
 * 시간표(플래너) 생성/수정 요청 DTO — FE mock `Planner` 의 중첩 입력 shape
 * (`formToPlannerPatch` 반환 = `Omit<Planner, 'id'|'active'|'archived'|'createdAt'|'updatedAt'>`)
 * 를 그대로 받는다. 평면 엔티티 컬럼으로의 변환은 service 가 담당한다
 * (`PlannerResponseDto.from` 의 역방향).
 *
 * 생성·수정 모두 동일 shape — FE EditPlannerContainer 가 전체 폼을 보내므로(부분 patch 아님)
 * 수정도 편집 가능 필드 전체 교체(full replace) 로 처리한다.
 */

/** `target: { kind, value }` — value 는 grade/score 면 number, free 면 string. */
class TargetInputDto {
  @IsString()
  @IsNotEmpty({ message: "target.kind 를 입력해주세요." })
  kind: string;

  /** number | string 유니온 — class-validator 단일 데코레이터로 표현 불가하므로 커스텀 검증. */
  @IsStringOrNumber({ message: "target.value 는 문자열 또는 숫자여야 합니다." })
  value: string | number;
}

/** `weekdayHours`/`weekendHours: { start, end }` — 0~24 시(時). */
class HoursInputDto {
  @IsInt()
  @Min(0)
  @Max(24)
  start: number;

  @IsInt()
  @Min(0)
  @Max(24)
  end: number;
}

/** `customization: { layoutId, weekLayoutId?, paletteId }` — 시간표 꾸미기(옵셔널). */
class CustomizationInputDto {
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

export class PlannerWriteDto {
  @IsString()
  @IsNotEmpty({ message: "플래너 이름을 입력해주세요." })
  name: string;

  @IsString()
  @IsNotEmpty()
  examType: string;

  @IsString()
  @IsNotEmpty()
  examLabel: string;

  @IsIsoCalendarDate({
    message: "examStartDate 는 유효한 YYYY-MM-DD 여야 합니다.",
  })
  examStartDate: string;

  @IsIsoCalendarDate({
    message: "examEndDate 는 유효한 YYYY-MM-DD 여야 합니다.",
  })
  examEndDate: string;

  // `@IsDefined()` 로 객체 자체의 존재성도 검증한다 — `@ValidateNested()` 만으로는
  // 필드를 통째로 누락하면 통과돼 service 의 `dto.target.kind` 접근에서 500 이 난다 (codex).
  @IsDefined({ message: "target 을 입력해주세요." })
  @ValidateNested()
  @Type(() => TargetInputDto)
  target: TargetInputDto;

  @IsDefined({ message: "weekdayHours 를 입력해주세요." })
  @ValidateNested()
  @Type(() => HoursInputDto)
  weekdayHours: HoursInputDto;

  @IsDefined({ message: "weekendHours 를 입력해주세요." })
  @ValidateNested()
  @Type(() => HoursInputDto)
  weekendHours: HoursInputDto;

  /** `Record<subject, string[]>` — 과목별 단원 라벨 목록. */
  @IsObject()
  @IsSubjectUnitsMap({
    message: "subjectUnits 는 과목별 문자열 배열 맵이어야 합니다.",
  })
  subjectUnits: Record<string, string[]>;

  @IsString()
  @IsNotEmpty()
  blockPattern: string;

  @IsBoolean()
  weaknessAutoReflect: boolean;

  @IsString()
  @IsNotEmpty()
  motivationStyle: string;

  /** mock Planner.motto 는 string(빈 값 ''). 빈 문자열 허용. */
  @IsString()
  motto: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomizationInputDto)
  customization?: CustomizationInputDto;
}

// ── 커스텀 검증 데코레이터 ─────────────────────────────────────────────────

/** value 가 string 또는 (NaN 아닌) number 인지 검증. */
function IsStringOrNumber(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isStringOrNumber",
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value === "string") return true;
          return typeof value === "number" && Number.isFinite(value);
        },
      },
    });
  };
}

/** `Record<string, string[]>` (모든 값이 문자열 배열) 인지 검증. */
function IsSubjectUnitsMap(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isSubjectUnitsMap",
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown): boolean {
          if (value === null || typeof value !== "object") return false;
          return Object.values(value as Record<string, unknown>).every(
            (v) =>
              Array.isArray(v) && v.every((label) => typeof label === "string"),
          );
        },
      },
    });
  };
}

/** `YYYY-MM-DD` 형식 + 실제 달력 날짜 검증 (BlocksQueryDto 와 동일 규칙). */
function IsIsoCalendarDate(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isIsoCalendarDate",
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== "string") return false;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
          const [y, m, d] = value.split("-").map(Number);
          const dt = new Date(Date.UTC(y, m - 1, d));
          return (
            dt.getUTCFullYear() === y &&
            dt.getUTCMonth() === m - 1 &&
            dt.getUTCDate() === d
          );
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} 는 유효한 YYYY-MM-DD 여야 합니다.`;
        },
      },
    });
  };
}
