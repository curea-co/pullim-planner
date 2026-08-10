import type { TimeBlock } from '@/lib/mock';
import type { BurnoutFactor, BurnoutSnapshot } from '@/lib/mock';

/**
 * 번아웃 안전도 실데이터 산출 (QA — mock `todayBurnout` 하드코딩 대체, FE 계산 1단계).
 *
 * 입력: 날짜별 블록(pullim-api 실블록 — `completed`/`emotion` 완료 메타 포함), 오늘(ISO),
 * 그리고 **이번 주 날짜 목록**(`weekDatesFor(todayIso, 0)`).
 * 집계는 `weekDates ∩ 오늘 이전`으로 클리핑한다 — 호출부의 blocksByDate에 과거 뷰 탐색으로
 * 로드된 다른 주 날짜가 섞여 있어도 점수가 화면 탐색에 따라 흔들리지 않게(Codex).
 * 미래 블록도 제외(미완료로 세면 항상 위험으로 왜곡). 주 초반엔 표본이 적을 수 있음 — B안(BE
 * 집계, 기간 확장) 이관 시 해소.
 *
 * 산출 지표 (완료 기록에서 직접 계산 가능한 것만):
 * - streak(연속 블록 완료율): 완료 학습 블록 / 계획 학습 블록
 * - emotion(감정 평균): 완료 기록의 감정 점수 평균 (기록 없으면 지표 제외)
 * - ※ 휴식 수용률·평균 수면은 산출 근거 데이터가 없어 제외 (BE 집계 전환 시 재검토 — QA #14 맥락)
 *
 * 점수: 지표 가중 평균(완료율 0.6 · 감정 0.4 — 감정 없으면 완료율 단독). 0~100, 높을수록 안전.
 * trend: 최근 3일 vs 그 이전 완료율 비교 (±10%p 이내 stable).
 *
 * 반환 null = 집계할 학습 블록이 아직 없음 → 호출부는 번아웃 UI를 데이터 부족 상태로 처리.
 */
export function computeBurnoutFromWeek(
  blocksByDate: Record<string, TimeBlock[]>,
  todayIso: string,
  weekDates: string[],
): BurnoutSnapshot | null {
  const pastDates = weekDates
    .filter((d) => d <= todayIso && d in blocksByDate)
    .sort();

  const studyOf = (d: string) => (blocksByDate[d] ?? []).filter((b) => b.type !== 'break');
  const allStudy = pastDates.flatMap(studyOf);
  if (allStudy.length === 0) return null;

  const doneOf = (blocks: TimeBlock[]) => blocks.filter((b) => b.status === 'done');

  // 시작 직후(집계 대상이 **오늘 하루뿐**)에 완료 0건이면 판정 보류(사용자 확정 08-03) —
  // 오늘 블록은 아직 진행 중이라 완료 0이 정상인데 "0점 · 위험"으로 겁주지 않는다('–' 표시).
  // 단, 과거 날짜에 블록이 있는데도 완료 0이면 실제 위험 신호이므로 그대로 판정한다(Codex).
  const pastStudy = pastDates.filter((d) => d < todayIso).flatMap(studyOf);
  if (doneOf(allStudy).length === 0 && pastStudy.length === 0) return null;

  // ── streak: 완료율(%)
  const completionPct = Math.round((doneOf(allStudy).length / allStudy.length) * 100);

  // ── emotion: 완료 기록의 감정 평균(1~5, 소수 1자리)
  const emotions = doneOf(allStudy)
    .map((b) => b.emotion)
    .filter((e): e is NonNullable<TimeBlock['emotion']> => e !== undefined && e !== null);
  const emotionAvg =
    emotions.length > 0
      ? Math.round((emotions.reduce((s, e) => s + e, 0) / emotions.length) * 10) / 10
      : null;

  const factors: BurnoutFactor[] = [
    {
      id: 'streak',
      label: '연속 블록 완료율',
      value: completionPct,
      unit: '%',
      weight: emotionAvg !== null ? 0.6 : 1,
      status: completionPct >= 70 ? 'good' : completionPct >= 40 ? 'warn' : 'bad',
    },
    ...(emotionAvg !== null
      ? [{
          id: 'emotion' as const,
          label: '감정 평균',
          value: emotionAvg,
          unit: '/5' as const,
          weight: 0.4,
          status: (emotionAvg >= 3.5 ? 'good' : emotionAvg >= 2.5 ? 'warn' : 'bad') as BurnoutFactor['status'],
        }]
      : []),
  ];

  // ── score: 가중 평균 (감정은 5점 만점 → 100 환산)
  const score = Math.round(
    emotionAvg !== null
      ? completionPct * 0.6 + (emotionAvg / 5) * 100 * 0.4
      : completionPct,
  );

  // ── trend: 최근 3일 vs 그 이전 완료율 (양쪽에 학습 블록이 있어야 판정)
  const recentDates = pastDates.slice(-3);
  const priorDates = pastDates.slice(0, -3);
  const pct = (dates: string[]) => {
    const blocks = dates.flatMap(studyOf);
    return blocks.length > 0 ? (doneOf(blocks).length / blocks.length) * 100 : null;
  };
  const recentPct = pct(recentDates);
  const priorPct = pct(priorDates);
  const trend: BurnoutSnapshot['trend'] =
    recentPct === null || priorPct === null ? 'stable'
    : recentPct - priorPct > 10 ? 'rising'
    : priorPct - recentPct > 10 ? 'falling'
    : 'stable';

  return { score, trend, factors, recommendBreak: score < 50 };
}
