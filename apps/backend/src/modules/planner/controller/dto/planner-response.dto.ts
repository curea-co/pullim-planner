import type { Planner } from "../../../../entities/planner.entity";
import type { PlannerSubjectUnit } from "../../../../entities/planner-subject-unit.entity";

/**
 * `GET /api/planners` 항목 — FE mock `Planner` 중첩 shape 재구성.
 *
 * 엔티티의 평면 컬럼(target_kind/value, weekday_start/end 등)을 mock 의 중첩 구조
 * (`target`, `weekdayHours`, `weekendHours`, `subjectUnits`)로 복원한다. target.value 는
 * grade/score 면 number, free 면 string (mock 시그니처 정렬).
 */
export class PlannerResponseDto {
  id: string;
  name: string;
  examType: string;
  examLabel: string;
  examStartDate: string;
  examEndDate: string;
  target: { kind: string; value: string | number };
  weekdayHours: { start: number; end: number };
  weekendHours: { start: number; end: number };
  subjectUnits: Record<string, string[]>;
  blockPattern: string;
  weaknessAutoReflect: boolean;
  motivationStyle: string;
  motto: string | null;
  active: boolean;
  archived: boolean;
  customization: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;

  /**
   * @param planner - 플래너 엔티티
   * @param units - 이 플래너의 과목 단원 (position 오름차순)
   */
  static from(
    planner: Planner,
    units: PlannerSubjectUnit[],
  ): PlannerResponseDto {
    const subjectUnits: Record<string, string[]> = {};
    for (const unit of units) {
      (subjectUnits[unit.subject] ??= []).push(unit.unitLabel);
    }

    const dto = new PlannerResponseDto();
    dto.id = planner.id;
    dto.name = planner.name;
    dto.examType = planner.examType;
    dto.examLabel = planner.examLabel;
    dto.examStartDate = planner.examStartDate;
    dto.examEndDate = planner.examEndDate;
    dto.target = {
      kind: planner.targetKind,
      value:
        planner.targetKind === "free"
          ? planner.targetValue
          : Number(planner.targetValue),
    };
    dto.weekdayHours = { start: planner.weekdayStart, end: planner.weekdayEnd };
    dto.weekendHours = { start: planner.weekendStart, end: planner.weekendEnd };
    dto.subjectUnits = subjectUnits;
    dto.blockPattern = planner.blockPattern;
    dto.weaknessAutoReflect = planner.weaknessAutoReflect;
    dto.motivationStyle = planner.motivationStyle;
    dto.motto = planner.motto;
    dto.active = planner.active;
    dto.archived = planner.archived;
    dto.customization = planner.customization;
    dto.createdAt = toIso(planner.createdAt);
    dto.updatedAt = toIso(planner.updatedAt);
    return dto;
  }
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}
