import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsString,
  Max,
  Min,
  ValidateNested,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";

import { IsPlainObject } from "./is-plain-object.validator";

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
  @IsIn(["grade", "score", "free"], {
    message: "target.kind 는 grade/score/free 중 하나여야 합니다.",
  })
  kind: string;

  /**
   * kind 에 따라 타입 교차검증 — grade/score 는 number, free 는 string.
   * (grade/score 에 문자열이 오면 PlannerResponseDto.from 의 Number() 변환이 NaN 이 됨, codex)
   */
  @IsValidTargetValue({ message: "target.value 가 kind 와 맞지 않습니다." })
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
  // end 는 start 보다 커야 한다 — 역전/0길이 시간대 차단 (codex cross-field).
  @IsGreaterThanField("start", {
    message: "학습 시간대의 end 는 start 보다 커야 합니다.",
  })
  end: number;
}

export class PlannerWriteDto {
  @IsString()
  @IsNotEmpty({ message: "플래너 이름을 입력해주세요." })
  name: string;

  @IsIn(["mock", "suneung", "midterm", "final", "other"], {
    message: "examType 이 허용된 값이 아닙니다.",
  })
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
  // examEndDate 는 examStartDate 이전일 수 없다 — 역전된 시험 범위 차단 (codex cross-field).
  @IsIsoDateNotBeforeField("examStartDate", {
    message: "examEndDate 는 examStartDate 보다 이전일 수 없습니다.",
  })
  examEndDate: string;

  // `@IsDefined()` 존재성 + `@IsPlainObject()` 로 배열/원시값 거부 — `@ValidateNested()` 만으론
  // 필드 누락이나 `target: []` 가 통과돼 service 의 `dto.target.kind` 접근에서 500 이 난다 (codex).
  @IsDefined({ message: "target 을 입력해주세요." })
  @IsPlainObject({ message: "target 은 객체여야 합니다." })
  @ValidateNested()
  @Type(() => TargetInputDto)
  target: TargetInputDto;

  @IsDefined({ message: "weekdayHours 를 입력해주세요." })
  @IsPlainObject({ message: "weekdayHours 는 객체여야 합니다." })
  @ValidateNested()
  @Type(() => HoursInputDto)
  weekdayHours: HoursInputDto;

  @IsDefined({ message: "weekendHours 를 입력해주세요." })
  @IsPlainObject({ message: "weekendHours 는 객체여야 합니다." })
  @ValidateNested()
  @Type(() => HoursInputDto)
  weekendHours: HoursInputDto;

  /** `Record<subject, string[]>` — 과목별 단원 라벨 목록. */
  @IsObject()
  @IsSubjectUnitsMap({
    message: "subjectUnits 는 과목별 문자열 배열 맵이어야 합니다.",
  })
  subjectUnits: Record<string, string[]>;

  @IsIn(["pomodoro", "focused", "deep"], {
    message: "blockPattern 이 허용된 값이 아닙니다.",
  })
  blockPattern: string;

  @IsBoolean()
  weaknessAutoReflect: boolean;

  @IsIn(["autonomous", "guided", "spartan"], {
    message: "motivationStyle 이 허용된 값이 아닙니다.",
  })
  motivationStyle: string;

  /** mock Planner.motto 는 string(빈 값 ''). 빈 문자열 허용. */
  @IsString()
  motto: string;

  // customization 은 생성/수정 본문에서 받지 않는다 — 전용 엔드포인트
  // (PUT /planners/:id/customization) 전담. 신규 플래너는 customization=null 로 시작하고
  // FE 가 기본값을 적용한다. (codex R5: PUT 이 customization 을 받고 조용히 버리던 스키마
  // 불일치 제거 — 스키마가 더 이상 이 필드를 광고하지 않는다.)
}

// ── 커스텀 검증 데코레이터 ─────────────────────────────────────────────────

/** target.value 가 kind 와 정합한지 검증 — grade/score=유한 number, free=비빈 string. */
function IsValidTargetValue(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isValidTargetValue",
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const kind = (args.object as Record<string, unknown>).kind;
          if (kind === "free") {
            return typeof value === "string" && value.trim().length > 0;
          }
          if (kind === "grade" || kind === "score") {
            return typeof value === "number" && Number.isFinite(value);
          }
          // kind 자체가 invalid 면 @IsIn 이 잡으므로 여기선 통과.
          return true;
        },
      },
    });
  };
}

/** 같은 객체의 다른 number 필드보다 큰지 검증 (cross-field). */
function IsGreaterThanField(otherField: string, options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isGreaterThanField",
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const other = (args.object as Record<string, unknown>)[otherField];
          if (typeof value !== "number" || typeof other !== "number") {
            // 타입 검증은 다른 데코레이터(@IsInt) 담당 — 여기선 통과시켜 중복 에러 방지.
            return true;
          }
          return value > other;
        },
      },
    });
  };
}

/** 같은 객체의 다른 ISO 날짜 필드보다 이전이 아닌지 검증 (cross-field). */
function IsIsoDateNotBeforeField(
  otherField: string,
  options?: ValidationOptions,
) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isIsoDateNotBeforeField",
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const other = (args.object as Record<string, unknown>)[otherField];
          if (typeof value !== "string" || typeof other !== "string") {
            return true;
          }
          // YYYY-MM-DD 는 사전식 비교가 시간순과 일치.
          return value >= other;
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
