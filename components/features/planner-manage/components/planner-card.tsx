'use client';

import { useRouter } from 'next/navigation';
import {
  CalendarClock, Clock, BookOpen, MoreVertical, CheckCircle2,
  Pencil, Copy, Archive, Trash2, Sparkles, Palette,
} from 'lucide-react';
import { subjectLabels, type Planner, type SubjectKey } from '@/lib/mock';
import { todayISO } from '@/lib/mock/planner';
import { examTypeMeta, blockPatternMeta } from '@/components/features/planner-builder/components/builder-types';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Props = {
  planner: Planner;
  onActivate: (id: string) => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onDecorate: (id: string) => void;
};

/** 일수 차이(달력일 기준) — 음수면 과거. 오늘(KST)·목표일 모두 날짜-only(로컬 자정)로 정규화해
 *  시각 혼용 off-by-one(시험 당일 오전 D-1 오표시)을 없앤다. (Codex #106) */
function diffDays(targetISO: string): number {
  const t = new Date(`${todayISO()}T00:00:00`).getTime();
  const target = new Date(`${targetISO}T00:00:00`).getTime();
  return Math.round((target - t) / 86400000);
}

function formatDday(d: number): string {
  if (d > 0) return `D-${d}`;
  if (d === 0) return 'D-DAY';
  return `D+${Math.abs(d)}`;
}

function formatRelativeUpdate(iso: string, today = new Date()): string {
  const ms = today.getTime() - new Date(iso).getTime();
  const day = Math.floor(ms / 86400000);
  if (day < 1) return '오늘 갱신';
  if (day < 7) return `${day}일 전 갱신`;
  return `${Math.floor(day / 7)}주 전 갱신`;
}

export function PlannerCard({ planner, onActivate, onDuplicate, onArchive, onDelete, onDecorate }: Props) {
  const router = useRouter();
  const dday = diffDays(planner.examStartDate);
  const subjectCount = Object.keys(planner.subjectUnits).length;
  const unitCount = Object.values(planner.subjectUnits).reduce((s, units) => s + (units?.length ?? 0), 0);
  const weekdayHours = planner.weekdayHours.end - planner.weekdayHours.start;
  const weekendHours = planner.weekendHours.end - planner.weekendHours.start;
  const weeklyTotal = weekdayHours * 5 + weekendHours * 2;
  const examTypeLabel = examTypeMeta[planner.examType].label;
  const blockPatternLabel = blockPatternMeta[planner.blockPattern].label;

  const isActive = planner.active;
  const isArchived = planner.archived;

  return (
    <article
      className={cn(
        'relative flex flex-col rounded-2xl border p-4 transition-all',
        isActive
          ? 'border-pullim-blue-500 bg-pullim-blue-50/30 ring-1 ring-pullim-blue-300 shadow-pullim-md'
          : isArchived
          ? 'border-pullim-slate-200 bg-pullim-slate-50/40 opacity-70'
          : 'border-pullim-slate-200 bg-card hover:border-pullim-blue-200',
      )}
    >
      {/* 활성 배지 */}
      {isActive && (
        <span className="bg-pullim-blue-600 absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wider uppercase text-white shadow-pullim-sm">
          <CheckCircle2 className="h-3 w-3" />
          활성
        </span>
      )}
      {isArchived && (
        <span className="bg-pullim-slate-300 text-pullim-slate-700 absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wider uppercase shadow-pullim-sm">
          <Archive className="h-3 w-3" />
          지난 시간표
        </span>
      )}

      {/* 헤더 — 이름 + 케밥 */}
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-pullim-slate-900 truncate text-base font-bold">
            {planner.name}
          </h3>
          <p className="text-pullim-slate-500 mt-0.5 text-xs">
            {examTypeLabel}
            {planner.motto && (
              <>
                <span className="mx-1">·</span>
                <span className="italic">{planner.motto}</span>
              </>
            )}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${planner.name} 메뉴`}
            className="text-pullim-slate-400 hover:bg-pullim-slate-100 hover:text-pullim-slate-700 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem
              onClick={() => onActivate(planner.id)}
              disabled={isActive || isArchived}
            >
              <CheckCircle2 className="text-pullim-blue-600" />
              활성화
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/planner/manage/${planner.id}/edit`)}>
              <Pencil className="text-pullim-slate-700" />
              수정
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDecorate(planner.id)}>
              <Palette className="text-pullim-blue-600" />
              꾸미기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(planner.id)}>
              <Copy className="text-pullim-slate-700" />
              복제
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onArchive(planner.id)}
              disabled={isActive || isArchived}
            >
              <Archive className="text-pullim-warn" />
              아카이브
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(planner.id)}
              disabled={isActive}
            >
              <Trash2 />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* 메트릭 4종 */}
      <div className="grid grid-cols-2 gap-2">
        <Metric Icon={CalendarClock} label="D-day" value={formatDday(dday)} sub={planner.examStartDate} tone={dday <= 14 && dday > 0 ? 'warn' : 'default'} />
        {/* QA #18 — 과목 키('math' 등)는 한글 라벨로 표기 */}
        <Metric Icon={BookOpen} label="과목·단원" value={`${subjectCount}·${unitCount}`} sub={(Object.keys(planner.subjectUnits) as SubjectKey[]).map(k => subjectLabels[k] ?? k).join(', ')} />
        <Metric Icon={Clock} label="주간 학습" value={`${weeklyTotal}h`} sub={`평일 ${weekdayHours}h · 주말 ${weekendHours}h`} />
        <Metric Icon={Sparkles} label="블록 패턴" value={blockPatternLabel} sub={blockPatternMeta[planner.blockPattern].spec} />
      </div>

      <footer className="border-pullim-slate-100 mt-3 flex items-center justify-between gap-2 border-t pt-3">
        <span className="text-pullim-slate-500 text-xs">
          {formatRelativeUpdate(planner.updatedAt)}
        </span>
        {!isActive && !isArchived && (
          <button
            type="button"
            onClick={() => onActivate(planner.id)}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1 rounded-lg px-3 py-2.5 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
          >
            <CheckCircle2 className="h-3 w-3" />
            이 시간표 활성화
          </button>
        )}
        {isActive && (
          <span className="text-pullim-blue-700 text-xs font-bold">
            지금 사용 중
          </span>
        )}
      </footer>
    </article>
  );
}

function Metric({
  Icon, label, value, sub, tone,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone?: 'warn' | 'default';
}) {
  return (
    <div className="bg-pullim-slate-50 rounded-md p-2">
      <div className="text-pullim-slate-500 inline-flex items-center gap-1 text-xs font-bold tracking-wider uppercase">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div
        className={cn(
          'mt-0.5 font-mono text-sm font-bold',
          tone === 'warn' ? 'text-pullim-danger' : 'text-pullim-slate-900',
        )}
      >
        {value}
      </div>
      <div className="text-pullim-slate-500 break-words text-xs sm:truncate">{sub}</div>
    </div>
  );
}
