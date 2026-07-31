'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CalendarShell, type CalendarView } from '../components/calendar-shell';
import type { Customization } from '@/lib/hooks/use-planner-customization';
import { DayView } from '../components/views/day-view';
import { WeekView } from '../components/views/week-view';
import { MonthView } from '../components/views/month-view';
import { planBaseDate, type MonthDay, type TimeBlock, type WeekDay } from '@/lib/mock/planner';
import {
  formatDayNavLabel, formatDayTitle, formatDayRelLabel,
  formatWeekNavLabel, formatWeekTitle,
  formatMonthNavLabel, formatMonthTitle, formatMonthShort,
} from '@/lib/planner/day-nav';
import { HomeHero } from '../components/home-hero';
import { BurnoutThresholdBanner } from '../components/burnout-threshold-banner';

interface HomePresenterProps {
  view: CalendarView;
  examName: string;
  dday: number;
  /** 활성 계획표 유무 — 없으면 히어로가 D-DAY 대신 "아직 시간표가 없어요" 표시 (QA #7) */
  hasActivePlanner?: boolean;
  burnoutScore: number;
  daySummary: { done: number; total: number };
  weekMeta: { totalHours: number; completedHours: number };
  monthMeta: { totalBlocks: number };
  /** 히어로 전용 — 뷰·offset 무관하게 항상 실제 오늘/이번 주 기준(헤더용 daySummary/weekMeta 와 분리). */
  heroDaySummary: { done: number; total: number };
  heroWeekMeta: { totalHours: number; completedHours: number };
  /** 기간 이동 offset (0=기준 기간). 일/주/월 공용 */
  offset: number;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  /** 날짜 점프 — 기준일 대비 offset 으로 이동 (일간 달력 선택) */
  onJumpOffset: (offset: number) => void;
  onChangeView: (next: CalendarView) => void;
  /** 실데이터(B4) — 미주입(dev bypass)이면 각 뷰가 mock 폴백. */
  dayBlocks?: TimeBlock[];
  /** 블록 완료 기록 실 저장(#416) — 미주입(dev bypass)이면 완료 다이얼로그가 데모(toast)로 동작. */
  onCompleteSubmit?: (blockId: string, input: { accuracy?: number; emotion?: number; notes?: string }) => Promise<boolean>;
  /** 실 active 플래너 꾸미기 — 홈 뷰 layout·palette 반영(미주입 시 mock 폴백). */
  customization?: Customization;
  weekDays?: WeekDay[];
  monthDays?: MonthDay[];
  /** 실데이터 월간 헤더 라벨("7월") — 미주입이면 mock 데모 라벨. */
  monthLabel?: string;
}

export default function HomePresenter({
  view,
  examName,
  dday,
  hasActivePlanner = true,
  burnoutScore,
  daySummary,
  weekMeta,
  monthMeta,
  heroDaySummary,
  heroWeekMeta,
  offset,
  onPrev,
  onNext,
  onReset,
  onJumpOffset,
  onChangeView,
  dayBlocks,
  onCompleteSubmit,
  customization,
  weekDays,
  monthDays,
  monthLabel,
}: HomePresenterProps) {
  // QA #7 — 활성 계획표가 없으면 "다른 시간표로 전환" 대신 생성 CTA (전환할 시간표가 없음).
  const switchAction = (
    <Link
      href={hasActivePlanner ? '/planner/manage' : '/planner/manage/new'}
      className="text-pullim-blue-600 hover:bg-pullim-blue-50 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1"
    >
      {hasActivePlanner ? '다른 시간표로 전환' : '시간표 만들기'}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
  // 헤더 설명의 시험명 — 활성 계획표 없으면 빈 <strong>이 남지 않게 생략.
  const examNameEl = hasActivePlanner && examName ? (
    <strong className="text-pullim-blue-700 inline-block max-w-[12ch] truncate align-bottom">{examName}</strong>
  ) : null;

  const headerProps = (() => {
    if (view === 'day') {
      // QA #2 — 제목은 "X월 Y일 Z요일"만('오늘의 학습' 제거), D-day 뱃지는 상단 배너와 중복이라 미노출.
      return {
        title: formatDayTitle(offset),
        description: (
          <>
            {examNameEl}
            {daySummary.total > 0 && (
              <>
                <span className="mx-1">·</span>
                {daySummary.done}/{daySummary.total} 블록 완료
              </>
            )}
          </>
        ),
        navLabel: formatDayNavLabel(offset),
        prevLabel: formatDayRelLabel(offset - 1),
        nextLabel: formatDayRelLabel(offset + 1),
      };
    }
    if (view === 'week') {
      return {
        title: formatWeekTitle(offset),
        description: (
          <>
            {examNameEl}
            {weekMeta.totalHours > 0 && (
              <>
                <span className="mx-1">·</span>
                이번 주 계획 <span className="font-mono text-pullim-slate-700 font-bold">{weekMeta.totalHours}h</span>
                <span className="mx-1">·</span>
                완료 <span className="font-mono text-pullim-success font-bold">{weekMeta.completedHours}h</span>
              </>
            )}
          </>
        ),
        navLabel: formatWeekNavLabel(offset),
        prevLabel: '지난 주',
        nextLabel: '다음 주',
      };
    }
    return {
      title: formatMonthTitle(offset),
      description: (
        <>
          {examNameEl}
          {monthMeta.totalBlocks > 0 && (
            <>
              <span className="mx-1">·</span>
              이번 달 학습 블록 <span className="font-mono font-bold">{monthMeta.totalBlocks}개</span>
            </>
          )}
        </>
      ),
      navLabel: formatMonthNavLabel(offset),
      prevLabel: formatMonthShort(offset - 1),
      nextLabel: formatMonthShort(offset + 1),
    };
  })();

  return (
    <>
      <HomeHero examName={examName} dday={dday} hasActivePlanner={hasActivePlanner} daySummary={heroDaySummary} weekMeta={heroWeekMeta} />
      {hasActivePlanner && <BurnoutThresholdBanner score={burnoutScore} />}
      <CalendarShell
        view={view}
        onChangeView={onChangeView}
        title={headerProps.title}
        description={headerProps.description}
        navLabel={headerProps.navLabel}
        prevLabel={headerProps.prevLabel}
        nextLabel={headerProps.nextLabel}
        onPrev={onPrev}
        onNext={onNext}
        datePicker={
          view === 'day'
            ? { baseISO: planBaseDate, currentOffset: offset, onPick: onJumpOffset }
            : undefined
        }
        action={switchAction}
      >
        {view === 'day' && <DayView dayOffset={offset} onResetToday={onReset} blocks={dayBlocks} dday={dayBlocks ? dday : undefined} onCompleteSubmit={onCompleteSubmit} customization={customization} />}
        {view === 'week' && <WeekView weekOffset={offset} onReset={onReset} days={weekDays} customization={customization} />}
        {view === 'month' && <MonthView monthOffset={offset} onReset={onReset} days={monthDays} monthLabel={monthLabel} />}
      </CalendarShell>
    </>
  );
}
