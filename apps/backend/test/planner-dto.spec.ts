import { BlockResponseDto } from "../src/modules/planner/controller/dto/block-response.dto";
import { MeResponseDto } from "../src/modules/planner/controller/dto/me-response.dto";
import { PlannerResponseDto } from "../src/modules/planner/controller/dto/planner-response.dto";
import type { BlockCompletion } from "../src/entities/block-completion.entity";
import type { Planner } from "../src/entities/planner.entity";
import type { PlannerSubjectUnit } from "../src/entities/planner-subject-unit.entity";
import type { TimeBlock } from "../src/entities/time-block.entity";
import type { DomainUser } from "../src/modules/auth/identity/domain-user.entity";

/**
 * Phase δ 응답 DTO 매핑 — 평면 엔티티 → FE mock 중첩 shape 변환을 고정한다.
 * (CI 에 Postgres·jest 가 없어 DB 통합은 로컬 수동검증으로 보완. 본 스펙은 순수 매핑 회귀 고정.)
 */
describe("PlannerResponseDto.from", () => {
  const base: Planner = {
    id: "pl_001",
    userId: "student_001",
    name: "6월 모의평가",
    examType: "mock",
    examLabel: "6월 모의평가",
    examStartDate: "2026-06-04",
    examEndDate: "2026-06-04",
    targetKind: "grade",
    targetValue: "1",
    weekdayStart: 18,
    weekdayEnd: 23,
    weekendStart: 10,
    weekendEnd: 22,
    blockPattern: "focused",
    weaknessAutoReflect: true,
    motivationStyle: "guided",
    motto: "사수",
    active: true,
    archived: false,
    customization: { layoutId: "vertical_timeline" },
    createdAt: new Date("2026-04-15T09:00:00.000Z"),
    updatedAt: new Date("2026-04-23T20:00:00.000Z"),
  };
  const units: PlannerSubjectUnit[] = [
    { plannerId: "pl_001", subject: "math", position: 0, unitLabel: "미적분" },
    {
      plannerId: "pl_001",
      subject: "math",
      position: 1,
      unitLabel: "확률과 통계",
    },
    { plannerId: "pl_001", subject: "english", position: 0, unitLabel: "독해" },
  ];

  it("평면 컬럼을 mock 중첩 shape 로 복원한다", () => {
    const dto = PlannerResponseDto.from(base, units);
    expect(dto.target).toEqual({ kind: "grade", value: 1 });
    expect(dto.weekdayHours).toEqual({ start: 18, end: 23 });
    expect(dto.weekendHours).toEqual({ start: 10, end: 22 });
    expect(dto.subjectUnits).toEqual({
      math: ["미적분", "확률과 통계"],
      english: ["독해"],
    });
    expect(dto.createdAt).toBe("2026-04-15T09:00:00.000Z");
  });

  it("target.value 는 grade/score 면 number, free 면 string", () => {
    expect(PlannerResponseDto.from(base, []).target.value).toBe(1);
    expect(
      PlannerResponseDto.from(
        { ...base, targetKind: "score", targetValue: "90" },
        [],
      ).target.value,
    ).toBe(90);
    expect(
      PlannerResponseDto.from(
        { ...base, targetKind: "free", targetValue: "1등급 사수" },
        [],
      ).target.value,
    ).toBe("1등급 사수");
  });
});

describe("BlockResponseDto.from", () => {
  const block: TimeBlock = {
    id: "b1",
    plannerId: "pl_001",
    date: "2026-06-04",
    startTime: "17:30:00",
    endTime: "18:10:00",
    subject: "math",
    type: "concept",
    title: "미분 기본 공식 시각화",
    linkedFeatureSlug: "visual",
    curriculumNodeId: "math.calc_diff.application",
    engines: ["cognitive_load", "active_recall"],
    status: "done",
    progress: 1,
    expectedMinutes: 40,
    reasoning: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("HH:MM:SS → HH:MM, 완료정보 병합", () => {
    const completion: BlockCompletion = {
      blockId: "b1",
      completedAt: new Date(),
      accuracy: 88,
      emotion: 4,
      notes: null,
    };
    const dto = BlockResponseDto.from(block, completion);
    expect(dto.start).toBe("17:30");
    expect(dto.end).toBe("18:10");
    expect(dto.accuracy).toBe(88);
    expect(dto.emotion).toBe(4);
    expect(dto.curriculumNodeId).toBe("math.calc_diff.application");
  });

  it("값 없는 선택 필드는 키 자체를 생략한다", () => {
    const rest: TimeBlock = {
      ...block,
      id: "b2",
      subject: "rest",
      type: "break",
      title: "저녁 식사",
      linkedFeatureSlug: null,
      curriculumNodeId: null,
      engines: [],
    };
    const dto = BlockResponseDto.from(rest, undefined);
    // 직렬화 기준으로 검증한다 — useDefineForClassFields(ES2022) 로 선언 필드가 undefined
    // own property 가 되지만 JSON.stringify 가 undefined 키를 생략하므로 실제 응답에선 빠진다.
    const serialized = JSON.parse(JSON.stringify(dto)) as Record<
      string,
      unknown
    >;
    expect("linkedFeatureSlug" in serialized).toBe(false);
    expect("curriculumNodeId" in serialized).toBe(false);
    expect("accuracy" in serialized).toBe(false);
    expect("reasoning" in serialized).toBe(false);
    expect("emotion" in serialized).toBe(false);
  });
});

describe("MeResponseDto.from", () => {
  const user: DomainUser = {
    id: "student_001",
    name: "서연",
    grade: "고2",
    track: "이과",
    school: "풀림고등학교",
    focusSubjects: ["math", "english", "science"],
    weeklyHours: 28,
    preferredStudyTime: "저녁",
    // KST 자정(=전날 15:00 UTC) — toKstIsoDate 가 KST 기준 날짜로 되돌리는지 검증.
    joinedAt: new Date("2026-01-11T15:00:00.000Z"),
    streakDays: 17,
  };

  it("user 필드 매핑 + joinedAt 은 KST YYYY-MM-DD", () => {
    const dto = MeResponseDto.from(user, null);
    expect(dto.id).toBe("student_001");
    expect(dto.focusSubjects).toEqual(["math", "english", "science"]);
    expect(dto.joinedAt).toBe("2026-01-12");
  });

  it("활성 플래너에서 examDate/examLabel 파생, 없으면 생략", () => {
    const withPlanner = MeResponseDto.from(user, {
      examStartDate: "2026-06-04",
      examLabel: "6월 모의평가",
    } as Planner);
    expect(withPlanner.examDate).toBe("2026-06-04");
    expect(withPlanner.examLabel).toBe("6월 모의평가");

    const serialized = JSON.parse(
      JSON.stringify(MeResponseDto.from(user, null)),
    ) as Record<string, unknown>;
    expect("examDate" in serialized).toBe(false);
  });
});
