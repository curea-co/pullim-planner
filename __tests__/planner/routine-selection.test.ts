/**
 * 서버로 나가는 루틴 적용 목록 — 죽은 id 는 떨구되, **모를 때는 떨구지 않는다.**
 *
 * 이 함수가 잘못되는 두 방향의 대가가 비대칭이라 두 방향을 다 고정한다:
 * 안 걸러서 죽은 id 가 나가면 400(저장 실패 — 되돌릴 수 있다),
 * 잘못 걸러서 살아 있는 id 가 빠지면 BE 가 "해제하라"로 읽어 **블록이 지워진다**(되돌릴 수 없다).
 */
import { toRoutineApplications } from '@/lib/planner/routine-selection';
import type { Routine } from '@/lib/mock';

const routine = (id: string): Routine => ({
  id,
  title: `루틴 ${id}`,
  subject: 'english',
  type: 'concept',
  startTime: '07:30',
  endTime: '08:00',
  weekdays: [0, 1, 2, 3, 4],
});

describe('toRoutineApplications', () => {
  it('살아 있는 루틴만 남긴다 — 삭제된 루틴의 id 는 서버로 나가지 않는다', () => {
    const out = toRoutineApplications(['r1', 'dead', 'r2'], [routine('r1'), routine('r2')]);
    expect(out).toEqual([
      { routineId: 'r1', endRange: 'exam' },
      { routineId: 'r2', endRange: 'exam' },
    ]);
  });

  it('순서를 폼 기준으로 보존한다 — 겹침 판정이 순서에 달려 있다', () => {
    const out = toRoutineApplications(['r2', 'r1'], [routine('r1'), routine('r2')]);
    expect(out.map((a) => a.routineId)).toEqual(['r2', 'r1']);
  });

  it('목록을 못 받았으면(null) 거르지 않는다 — 조회 실패가 적용 루틴을 지우면 안 된다', () => {
    const out = toRoutineApplications(['r1', 'dead'], null);
    expect(out.map((a) => a.routineId)).toEqual(['r1', 'dead']);
  });

  it('목록을 받았는데 비어 있으면 전부 떨군다 — 루틴을 다 지운 사용자의 정상 상태다', () => {
    expect(toRoutineApplications(['r1'], [])).toEqual([]);
  });

  it('빈 선택은 빈 배열 — null 과 결과가 같아도 의미가 다르므로 둘 다 고정한다', () => {
    expect(toRoutineApplications([], [routine('r1')])).toEqual([]);
    expect(toRoutineApplications([], null)).toEqual([]);
  });
});
