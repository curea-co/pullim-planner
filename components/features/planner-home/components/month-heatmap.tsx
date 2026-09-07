'use client';

import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { monthView, type MonthDay } from '@/lib/mock';
import { cn } from '@/lib/utils';

const weekHeader = ['월', '화', '수', '목', '금', '토', '일'];

/**
 * 월간 히트맵 — 일별 블록 수 색 강도 + D-day 마일스톤 표시.
 * 핸드오프 4.4 (월간 뷰).
 *
 * 미래 날짜도 색 강도·개수를 그대로 그린다(점선 외곽선으로 '예정'만 구분) — materialize
 * 이후 미래 블록은 초안이 아니라 확정 계획이라, 투명 처리하면 시험까지의 계획이
 * 전부 비어 보인다(2026-07-05 검수: "월간 뷰 7월 이후 안 보임").
 * 셀 클릭 — 과거/오늘은 일간 뷰로 drill-down. 미래는 예정 안내 토스트.
 */
export function MonthHeatmap({
  days: daysProp,
  monthLabel,
  onNavigate,
}: {
  /** 실데이터(B4) — 미주입이면 mock 데모(monthView) 폴백. */
  days?: MonthDay[];
  /** 실데이터 월 라벨("7월"). 미주입=데모 라벨. */
  monthLabel?: string;
  /**
   * 이 위젯이 계산한 목적지로 이동시킨다 — **방법은 컨테이너가 정한다.**
   *
   * 이 위젯은 `/planner` 와 `/planner/reports` 양쪽에 실린다. 같은 pathname 안(쿼리만 변경)
   * 에서는 History API 여야 하고(F-01 — `lib/planner/query-nav` 주석), 다른 경로에서는 진짜
   * 라우트 이동이어야 한다. 그 판단은 라우트를 아는 컨테이너의 몫이고, 재사용 위젯이
   * 라우팅 훅으로 직접 하면 feature `components/` 의 계층 규칙도 깨진다(Codex).
   */
  onNavigate: (url: string) => void;
}) {
  const isReal = daysProp !== undefined;
  const month = daysProp ?? monthView;
  // 그리드 시작 — 첫 날의 weekday로 빈 셀 padding
  const firstWeekdayIdx = weekHeader.indexOf(month[0].weekday);
  const padBefore = firstWeekdayIdx;

  function onCell(d: MonthDay) {
    // 실데이터(B4b): 클릭한 날짜의 offset(오늘 대비 일 수)으로 일간 뷰 딥링크. 과거·오늘·미래 모두
    // 이동(미래는 예정 블록을 일간 뷰에서 확인). #113 이후 미래 블록도 확정 계획으로 표시된다.
    if (isReal) {
      const o = d.dayOffset ?? 0;
      const q = o !== 0 ? `?view=day&d=${o}` : '?view=day';
      onNavigate(`/planner${q}`);
      return;
    }
    // mock 데모 — 데이터 단위가 오늘 1일치만 있어, 미래는 예정 toast·나머지는 오늘 day view.
    if (d.isFuture) {
      toast.info(`📅 ${d.date}일 예정`, {
        description: `예정 ${d.blockCount}개 블록 — 그날이 되면 일간 뷰에서 진행할 수 있어요.`,
      });
      return;
    }
    onNavigate('/planner?view=day');
  }

  return (
    <section className="bg-card overflow-hidden rounded-2xl border">
      <header className="border-b p-4">
        <p className="text-pullim-blue-600 text-[length:var(--text-xs)] font-bold tracking-wider uppercase">
          월간 학습 캘린더
        </p>
        {/* QA #17 — 헤더의 해석 안내 문구 삭제 (범례는 기존대로 하단) */}
        <h2 className="text-pullim-slate-900 mt-0.5 text-base font-bold tracking-tight">
          {monthLabel ?? '4월'} 학습 분포
        </h2>
      </header>

      <div className="p-4">
        {/* 요일 헤더 */}
        <div className="text-pullim-slate-600 mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[length:var(--text-2xs)] font-bold">
          {weekHeader.map(w => (
            <div key={w} className={w === '토' || w === '일' ? 'text-pullim-slate-700' : ''}>{w}</div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: padBefore }, (_, i) => (
            <div key={`pad-${i}`} aria-hidden />
          ))}
          {month.map(d => <DayCell key={d.date} day={d} onSelect={() => onCell(d)} />)}
        </div>

        {/* 범례 */}
        <div className="text-pullim-slate-500 mt-4 flex flex-wrap items-center gap-3 text-[length:var(--text-xs)]">
          <span className="font-bold tracking-wider uppercase">강도</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-pullim-heat-0 border border-pullim-slate-200" /> 0개
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-pullim-heat-2" /> 4–5
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-pullim-heat-4" /> 6–7
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-pullim-heat-5" /> 8+
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <span className="border-pullim-success h-3 w-3 rounded-sm border-2" /> 100% 완료
          </span>
          {/* 깃발 의미 — 헤더 안내 문구 삭제(QA #17)로 유일한 설명 위치가 범례로 이동 */}
          <span className="inline-flex items-center gap-1">
            <Flag aria-hidden className="text-pullim-warn h-3 w-3" /> 시험·모평
          </span>
        </div>
      </div>
    </section>
  );
}

function heatColor(count: number, isFuture: boolean): string {
  // 계획 없는 미래만 투명(점선 테두리만). 블록 있는 미래는 과거와 동일 강도 스케일.
  if (count === 0) return isFuture ? 'transparent' : 'var(--color-pullim-heat-0)';
  if (count <= 3)  return 'var(--color-pullim-heat-1)';
  if (count <= 5)  return 'var(--color-pullim-heat-2)';
  if (count <= 7)  return 'var(--color-pullim-heat-3)';
  if (count <= 8)  return 'var(--color-pullim-heat-4)';
  return 'var(--color-pullim-heat-5)';
}

function DayCell({ day, onSelect }: { day: MonthDay; onSelect: () => void }) {
  const bg = heatColor(day.blockCount, !!day.isFuture);
  // 흰 텍스트는 heat-4 이상에서만 안전 (heat-3 #5A8BFF는 흰글자 대비 3.2:1로 부족)
  const isDarkBg = day.blockCount >= 8;
  /**
   * **잉크는 「미래냐」가 아니라 「무엇 위에 얹히냐」가 정한다.**
   *
   * 종전에는 「미래 = 옅게(`slate-500`)」였는데, 미래여도 블록이 있으면 과거와 같은 강도로
   * 칠해진다(`heatColor` 는 미래를 따로 낮추지 않는다). 그 위의 `slate-500` 은 heat-3 에서
   * **1.60:1** — AA 4.5:1 의 3분의 1이다. 「오늘」 강조(`blue-700`)와 블록 수(`slate-700`)도
   * 같은 자리에서 각각 **2.15:1 · 3.26:1** 로 무너져 있었다.
   *
   * 라이트 실측(canvas 로 칠해 sRGB 픽셀을 읽은 값):
   *
   * | 잉크 \ 바탕 | heat-0 | heat-1 | heat-2 | heat-3 | heat-4 | heat-5 | 안 칠함(흰 카드) |
   * |---|---|---|---|---|---|---|---|
   * | `slate-900` | 15.91 | 13.94 | 10.13 | **5.54** | 2.82 | 1.13 | 17.69 |
   * | `white`     |  1.11 |  1.27 |  1.75 | 3.20 | **6.27** | **15.64** | 1.00 |
   * | `blue-700`  | **6.19** | **5.42** | 3.94 | 2.15 | 1.10 | 2.27 | **6.88** |
   * | `slate-500` |  4.61 |  4.04 |  2.93 | 1.60 | 1.22 | 3.05 | **5.12** |
   *
   * 그래서 규칙은 바탕 기준이다 — 옅은 잉크는 **칠하지 않은 셀**에만, 「오늘」 파랑은
   * **heat-0/1 이하**에만. 미래의 「아직 안 왔다」는 칠하지 않음 + 점선 테두리가 이미
   * 말하고 있으니 잉크로 두 번 말할 이유도 없다.
   */
  const unpainted = !!day.isFuture && day.blockCount === 0;
  /** 「오늘」 파랑이 4.5:1 을 넘는 바탕 — heat-0(0개)·heat-1(1~3개)과 칠하지 않은 셀. */
  const accentSafe = unpainted || day.blockCount <= 3;
  const completed = day.completionPct === 100;
  const milestoneLabel = day.examMilestone?.label;
  const tooltip = milestoneLabel
    ? `${day.date}일 · ${day.blockCount}개 블록 · 완료 ${day.completionPct}% · ${milestoneLabel}`
    : `${day.date}일 · ${day.blockCount}개 블록 · 완료 ${day.completionPct}%`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={tooltip}
      title={tooltip}
      className={cn(
        'group relative aspect-square cursor-pointer rounded-lg border transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1',
        'hover:scale-[1.04] active:scale-[0.98]',
        day.isFuture
          ? 'border-dashed border-pullim-slate-200 hover:border-pullim-blue-300'
          : 'border-transparent',
        day.isToday && 'ring-pullim-blue-500 ring-2 ring-offset-1',
        completed && !day.isToday && !day.isFuture && 'border-pullim-success border-2',
      )}
      style={{ background: bg }}
    >
      <div className="flex h-full flex-col items-center justify-center">
        <span
          className={cn(
            'font-mono text-xs font-bold',
            isDarkBg ? 'text-white' : unpainted ? 'text-pullim-slate-500' : 'text-pullim-slate-900',
            // 오늘은 링(`ring-2`)이 이미 표시한다 — 파랑이 안 되는 바탕에서는 잉크를 포기한다.
            day.isToday && accentSafe && 'text-pullim-blue-700',
          )}
        >
          {day.date}
        </span>
        {day.blockCount > 0 && (
          <span
            className={cn(
              'text-[length:var(--text-2xs)] font-mono mt-0.5 font-semibold',
              // 블록 수도 같은 바탕 위다 — slate-700 은 heat-3 에서 3.26:1 이라 못 쓴다.
              isDarkBg ? 'text-white/95' : 'text-pullim-slate-900',
            )}
          >
            {day.blockCount}개
          </span>
        )}
        {day.hasExamMilestone && (
          <Flag
            aria-label={`${day.examMilestone?.label ?? '시험·모평'}`}
            className={cn(
              'absolute top-0 right-0 h-3 w-3',
              day.examMilestone?.importance === 'high' ? 'text-pullim-danger' : 'text-pullim-warn',
            )}
          />
        )}
      </div>
    </button>
  );
}
