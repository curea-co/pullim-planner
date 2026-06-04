import { toKstIsoDate } from "../../../../common/utils/datetime.util";
import type { Planner } from "../../../../entities/planner.entity";
import type { DomainUser } from "../../../auth/identity/domain-user.entity";

/**
 * `GET /api/me` 응답 — FE mock `Persona` shape 복원.
 *
 * users 테이블이 보유한 필드 + **활성 플래너에서 파생한 시험 정보**(examDate/examLabel).
 * mock 의 `currentPersona.examDate/examLabel` 은 "가장 가까운 시험" = 활성 플래너의 시험이라,
 * FE 의 `getDday(persona)`·`persona.examLabel` 계약을 깨지 않도록 active planner 에서 채운다
 * (활성 플래너 없으면 생략). `joinedAt` 은 mock 과 동일하게 KST `YYYY-MM-DD`.
 */
export class MeResponseDto {
  id: string;
  name: string;
  grade: string;
  track: string;
  // FE mock Persona.school 은 string — 온보딩 전 null 이면 빈 문자열로 내려 계약을 맞춘다.
  school: string;
  examDate?: string;
  examLabel?: string;
  focusSubjects: string[];
  weeklyHours: number;
  preferredStudyTime: string;
  joinedAt: string;
  streakDays: number;

  /**
   * @param user - 도메인 사용자
   * @param activePlanner - 활성 플래너(시험 정보 파생용). 없으면 시험 필드 생략.
   */
  static from(user: DomainUser, activePlanner: Planner | null): MeResponseDto {
    const dto = new MeResponseDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.grade = user.grade;
    dto.track = user.track;
    dto.school = user.school ?? "";
    // examDate/examLabel 은 활성 플래너에서 파생(가장 가까운 시험). 활성 플래너가 없으면
    // 생략한다 — 시험일을 임의로 날조하지 않는다. 데모 사용자(student_001)는 항상 활성
    // 플래너가 있어 채워지며, 활성 플래너 없는 실사용자의 nullable 처리는 Phase η(FE 계약 이주).
    if (activePlanner) {
      dto.examDate = activePlanner.examStartDate;
      dto.examLabel = activePlanner.examLabel;
    }
    dto.focusSubjects = user.focusSubjects;
    dto.weeklyHours = user.weeklyHours;
    dto.preferredStudyTime = user.preferredStudyTime;
    dto.joinedAt = toKstIsoDate(user.joinedAt);
    dto.streakDays = user.streakDays;
    return dto;
  }
}
