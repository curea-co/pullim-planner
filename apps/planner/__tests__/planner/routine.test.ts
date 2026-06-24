import {
  formatWeekdays, minutesBetween,
  addRoutine, updateRoutine, removeRoutine, restoreRoutine, findRoutine, getRoutines, resetMockRoutines,
  type Weekday,
} from '@/lib/mock/routine';

describe('routine mock', () => {
  afterEach(() => resetMockRoutines());

  describe('formatWeekdays', () => {
    it.each<[Weekday[], string]>([
      [[0, 1, 2, 3, 4, 5, 6], '매일'],
      [[0, 1, 2, 3, 4], '주중'],
      [[5, 6], '주말'],
      [[0, 2, 4], '월·수·금'],
      [[6], '일'],
    ])('%j → %s', (weekdays, expected) => {
      expect(formatWeekdays(weekdays)).toBe(expected);
    });
  });

  describe('minutesBetween', () => {
    it('07:30–08:00 → 30', () => expect(minutesBetween('07:30', '08:00')).toBe(30));
    it('19:00–19:50 → 50', () => expect(minutesBetween('19:00', '19:50')).toBe(50));
  });

  describe('CRUD', () => {
    it('add → find → update → remove', () => {
      const before = getRoutines().length;
      const r = addRoutine({
        title: '테스트', subject: 'math', type: 'concept',
        startTime: '09:00', endTime: '09:30', weekdays: [0, 2],
      });
      expect(getRoutines().length).toBe(before + 1);
      expect(findRoutine(r.id)?.title).toBe('테스트');

      updateRoutine(r.id, { title: '수정됨' });
      expect(findRoutine(r.id)?.title).toBe('수정됨');

      removeRoutine(r.id);
      expect(findRoutine(r.id)).toBeUndefined();
      expect(getRoutines().length).toBe(before);
    });

    it('updateRoutine 없는 id → undefined', () => {
      expect(updateRoutine('nope', { title: 'x' })).toBeUndefined();
    });

    it('remove → restore 가 원래 id·위치를 보존한다 (엔티티 동일성)', () => {
      const ids = getRoutines().map((r) => r.id);
      const targetId = ids[1];
      const removed = removeRoutine(targetId);
      expect(removed?.routine.id).toBe(targetId);
      expect(removed?.index).toBe(1);
      expect(findRoutine(targetId)).toBeUndefined();

      restoreRoutine(removed!.routine, removed!.index);
      expect(findRoutine(targetId)?.id).toBe(targetId); // 새 id 아님
      expect(getRoutines().map((r) => r.id)).toEqual(ids); // 위치 보존
    });

    it('restoreRoutine 중복 id 는 무시', () => {
      const r = getRoutines()[0];
      const before = getRoutines().length;
      restoreRoutine(r, 0);
      expect(getRoutines().length).toBe(before);
    });

    it('removeRoutine 없는 id → undefined', () => {
      expect(removeRoutine('nope')).toBeUndefined();
    });
  });
});
