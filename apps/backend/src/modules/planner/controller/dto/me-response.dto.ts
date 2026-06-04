import type { DomainUser } from "../../../auth/identity/domain-user.entity";

/**
 * `GET /api/me` 응답 — 도메인 사용자(users). FE mock `Persona` 중 users 테이블이 보유한
 * 필드만(시험 일정 examDate/examLabel 은 플래너 소관이라 제외).
 */
export class MeResponseDto {
  id: string;
  name: string;
  grade: string;
  track: string;
  school: string | null;
  focusSubjects: string[];
  weeklyHours: number;
  preferredStudyTime: string;
  joinedAt: string;
  streakDays: number;

  static from(user: DomainUser): MeResponseDto {
    const dto = new MeResponseDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.grade = user.grade;
    dto.track = user.track;
    dto.school = user.school;
    dto.focusSubjects = user.focusSubjects;
    dto.weeklyHours = user.weeklyHours;
    dto.preferredStudyTime = user.preferredStudyTime;
    dto.joinedAt =
      user.joinedAt instanceof Date
        ? user.joinedAt.toISOString()
        : String(user.joinedAt);
    dto.streakDays = user.streakDays;
    return dto;
  }
}
