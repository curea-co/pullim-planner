import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { planners, users } from '@/lib/db/schema';
import { getUserId } from '../_lib/auth';
import { apiError, ok } from '../_lib/response';

export async function GET(req: Request) {
  const userId = getUserId(req);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) {
    return apiError('not_found', `User ${userId} not found`);
  }

  // mock Persona의 examDate/examLabel은 active planner 정보 — Ph7 FE compat
  const active = await db.query.planners.findFirst({
    where: and(
      eq(planners.userId, userId),
      eq(planners.active, true),
      eq(planners.archived, false),
    ),
  });

  return ok({
    id: user.id,
    name: user.name,
    grade: user.grade,
    track: user.track,
    school: user.school ?? '',
    examDate: active?.examStartDate ?? '',
    examLabel: active?.examLabel ?? '',
    focusSubjects: user.focusSubjects,
    weeklyHours: user.weeklyHours,
    preferredStudyTime: user.preferredStudyTime,
    joinedAt: user.joinedAt.toISOString().slice(0, 10),
    streakDays: user.streakDays,
  });
}
