'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, Sparkles, Check, AlertCircle,
  Smartphone, Users, BookOpenCheck, Sunrise,
  Target, PencilLine, BookOpen, Brain,
  Coffee, FileText, Mic, MessageCircle, ChevronLeft, ChevronRight, ChevronDown, Repeat2,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ROUTINE_ENABLED, WEAKNESS_ENABLED, NOTIFICATIONS_ENABLED } from '@/lib/flags';
import {
  subjectLabels, type SubjectKey, getWeakNodes, allCurricula,
  type BlockType, type Routine,
  getRoutines, findRoutine, routineSubjectLabel, formatWeekdays, blockTypeMeta,
} from '@/lib/mock';
import { BLOCK_TYPE_STRIPE } from '@/lib/planner/block-type-style';
import { type PreviewDay, type PreviewItem } from '@/lib/planner/preview-map';
import { RoutineConflictNotice } from './routine-conflict-notice';
import { busyRanges, placeRoutinesForDay } from '@/lib/planner/routine-fit';
import { daysBetween } from '@/lib/planner/exam-presets';
import {
  type PlannerForm, type ScopeState, blockPatternMeta,
  type ExamType, examTypeMeta, todayIsoKst,
  autoExamName, withAutoExamName, resolvedExamName, presetsForExamType,
  goalBlocker, scopeBlocker,
} from './builder-types';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RequiredMark } from '@/components/shell/required-mark';

type Props = {
  form: PlannerForm;
  setForm: (next: PlannerForm) => void;
};

/* ─── Step 1 — 목표 시험 (종류 카드 + 프리셋 회차 + 일자) ─── */

/**
 * 목표 시험 5종을 한 줄에 놓는다 — '기타'(자유 목표)까지 같은 격자다.
 * 아래 한 줄로 빼 뒀던 이유는 '성격이 다르다'였는데, 그 차이는 고르고 난 **뒤**
 * (날짜가 자유롭고 목표가 자유 텍스트가 된다) 드러나지 고르는 순간에 드러나지 않는다.
 * 고를 때는 다섯이 대등한 선택지라 같은 줄에 둔다(오너 결정 2026-09-01).
 */
const examTypeCards: ExamType[] = ['mock', 'suneung', 'midterm', 'final', 'other'];

export function PStep1Goal({ form, setForm, expert, onExpertChange }: Props & {
  /** 시험명·다짐 묶음을 펼친 상태인가 — 위저드가 단계 이동과 무관하게 들고 있는 표시 상태 */
  expert?: boolean;
  /** 미주입이면 토글 자체를 렌더하지 않는다(펼침 상태를 밖에서만 정하는 경우) */
  onExpertChange?: (next: boolean) => void;
}) {
  const examType = form.examType ?? 'mock';
  const meta = examTypeMeta[examType];
  // 오늘(KST)은 렌더마다 계산 — 모듈 상수로 캐시하면 자정 이후 min/D-day가 goNext/activate의
  // todayIsoKst() 검증 기준과 어긋난다(Codex). 새 날짜 선택 하한(min)은 신규·수정 공통 오늘부터
  // (사용자 확정 08-03). 검증은 종료일 기준 — 진행 중 범위 시험의 기존 시작일은 유지 가능.
  const todayIso = todayIsoKst();
  const minDate = todayIso;
  const startDate = form.examStartDate ?? '';
  const endDate = form.examEndDate ?? startDate;
  // 수능·모의고사는 전국이 같은 날 — 앱이 갖고 있어야 할 값이라 채워 준다.
  const presets = presetsForExamType(examType, todayIso);

  const dDay = startDate ? daysBetween(todayIso, startDate) : null;

  const examLength = useMemo(() => {
    if (!meta.isRange || !startDate || !endDate) return 1;
    return Math.max(1, daysBetween(startDate, endDate) + 1);
  }, [meta.isRange, startDate, endDate]);

  /**
   * 시험 종류 전환.
   * - 회차가 하나뿐인 프리셋(수능 등)은 탭 한 번에 날짜까지 확정한다.
   * - 회차가 둘이면 비워 두고 아래에서 고르게 한다.
   * - 프리셋이 있던 종류에서 없는 종류로 가면 이전 프리셋 날짜를 끌고 가지 않는다.
   */
  function setExamType(t: ExamType) {
    const nextPresets = presetsForExamType(t, todayIso);
    let start = startDate;
    if (nextPresets.length === 1) start = nextPresets[0].date;
    else if (nextPresets.length > 1 || presets.length > 0) start = '';
    const end = examTypeMeta[t].isRange
      ? (endDate && start && endDate >= start ? endDate : start)
      : start;
    setForm(withAutoExamName(form, { ...form, examType: t, examStartDate: start, examEndDate: end }));
  }

  function pickPreset(date: string) {
    setForm(withAutoExamName(form, { ...form, examStartDate: date, examEndDate: date }));
  }

  function setStart(v: string) {
    // 범위 시험에서 새 start가 end보다 늦으면 end도 함께 밀어줌
    const nextEnd = meta.isRange ? (endDate && endDate >= v ? endDate : v) : v;
    setForm(withAutoExamName(form, { ...form, examStartDate: v, examEndDate: nextEnd }));
  }

  function setEnd(v: string) {
    setForm(withAutoExamName(form, { ...form, examEndDate: v < startDate ? startDate : v }));
  }

  const dDayLabel =
    dDay === null ? '—'
    : dDay > 0 ? `D-${dDay}`
    : dDay === 0 ? 'D-DAY'
    : `D+${Math.abs(dDay)}`;

  return (
    <div className="space-y-4">
      {/* 시험 종류 */}
      <section>
        <h3 className="text-pullim-slate-700 mb-1.5 text-xs font-bold">
          목표 시험<RequiredMark />
        </h3>
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {examTypeCards.map(t => {
            const m = examTypeMeta[t];
            const selected = examType === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={selected}
                onClick={() => setExamType(t)}
                className={cn(
                  'group flex flex-col items-center justify-center gap-1 rounded-xl border-2 bg-card px-0.5 py-2 text-center transition-colors',
                  'sm:px-2 sm:pt-2.5 sm:pb-2',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                  selected
                    ? 'border-pullim-blue-500 bg-pullim-blue-50'
                    : 'border-pullim-slate-200 hover:border-pullim-blue-300 hover:bg-pullim-slate-50',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors sm:h-8 sm:w-8',
                    selected
                      ? 'bg-pullim-blue-600 text-white'
                      : 'bg-pullim-slate-100 text-pullim-slate-500 group-hover:bg-pullim-blue-100 group-hover:text-pullim-blue-600',
                  )}
                >
                  <m.Icon className="h-4 w-4 sm:h-[17px] sm:w-[17px]" aria-hidden />
                </span>
                {/* 'other' 만 meta 의 '기타' 대신 하는 일이 드러나는 이름으로 부른다 —
                    카드에서만 쓰는 표기라 examTypeMeta.label(저장·요약 표기)은 건드리지 않는다. */}
                <span
                  className={cn(
                    'max-w-full truncate text-[11px] font-bold leading-tight sm:text-[13px]',
                    selected ? 'text-pullim-blue-700' : 'text-pullim-slate-900',
                  )}
                >
                  {t === 'other' ? '자유 목표' : m.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 회차 선택 — 가장 가까운 시험이 코앞이라 다음 회차도 함께 줄 때만 */}
      {presets.length > 1 && (
        <section>
          <h3 className="text-pullim-slate-700 mb-1.5 text-xs font-bold">회차<RequiredMark /></h3>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {presets.map((p, i) => {
              const selected = startDate === p.date;
              return (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => pickPreset(p.date)}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-2.5 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                    selected
                      ? 'border-pullim-blue-500 bg-pullim-blue-50'
                      : 'border-pullim-slate-200 hover:border-pullim-blue-300',
                  )}
                >
                  <span className="min-w-0">
                    <span className={cn('block text-xs font-bold', selected ? 'text-pullim-blue-700' : 'text-pullim-slate-900')}>
                      {p.name}
                    </span>
                    <span className="text-pullim-slate-500 block font-mono text-[10px]">{p.date}</span>
                  </span>
                  <span className="text-pullim-slate-500 shrink-0 font-mono text-[11px] font-bold">
                    D-{daysBetween(todayIso, p.date)}
                    {i === 1 && <span className="text-pullim-slate-400 ml-1 font-sans">그 다음</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 일자 — 프리셋이 채워 줘도 입력은 열어 둔다 */}
      <div>
        {meta.isRange ? (
          <div className="grid grid-cols-2 gap-3">
            <DateField label="시험 시작일" required value={startDate} onChange={setStart} min={minDate} />
            <DateField label="시험 종료일" value={endDate} onChange={setEnd} min={startDate || minDate} />
          </div>
        ) : (
          <DateField
            label={examType === 'other' ? '목표 날짜' : '시험 날짜'}
            required
            value={startDate}
            onChange={setStart}
            min={minDate}
          />
        )}
        <p className="text-pullim-slate-500 mt-1 font-mono text-[10px]">
          D-day{' '}
          <span className={cn(
            'font-bold',
            dDay === null ? 'text-pullim-slate-400'
              : dDay <= 14 ? 'text-pullim-danger'
              : 'text-pullim-blue-600',
          )}>
            {dDayLabel}
          </span>
          {meta.isRange && examLength > 1 && (
            <span className="text-pullim-slate-400 ml-1">· {examLength}일간</span>
          )}
        </p>
        {/* 프리셋 날짜가 '추정치'임을 알리는 유일한 자리 — 보조 문구 정리(2026-08-24) 때 지웠다가
            오너 결정으로 복원했다. 10px 회색은 안 보인다는 지적이라 warn 배너 + 12px 로 되돌린다
            (`routine-conflict-notice` 의 색 배너 패턴을 따른다). */}
        {presets.length > 0 && (
          <aside className="border-pullim-warn/40 bg-pullim-warn-bg text-pullim-slate-700 mt-2 flex items-start gap-1.5 rounded-lg border p-2 text-xs leading-relaxed">
            <AlertCircle className="text-pullim-warn mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              이 날짜는 <strong className="text-pullim-slate-900">관례로 계산한 추정치</strong>라 해마다
              어긋날 수 있어요. 학교에서 받은 일정과 다르면 위에서 바로 고치세요.
            </span>
          </aside>
        )}
      </div>

      {/* 목표는 최소 경로에서도 받는다. 시간표 배치를 바꾸지 않는 값이지만 BE `target` 이
          필수라(`kind` 는 examType 파생, grade/score 는 숫자, free 는 비빈 문자열) 묻지
          않으면 학생이 정하지 않은 값이 저장된다 — 빈 등급이 1등급으로 박혔다(Codex).
          아래 '시험명·다짐 직접 쓰기' 를 펼치면 같은 입력을 그쪽에서 편집한다(중복 노출 방지). */}
      {!expert && <TargetField form={form} setForm={setForm} />}

      {/* 자동 시험명 — 이름은 시험 종류·날짜에서 파생한다. 고치려면 아래 토글을 펼친다. */}
      <section className="bg-pullim-slate-900 flex items-center justify-between gap-3 rounded-xl p-3.5 text-white">
        <div className="min-w-0">
          <div className="text-pullim-lemon text-[10px] font-bold tracking-wider uppercase">
            {examType === 'other' ? '자유 목표' : '자동 생성됨'}
          </div>
          <div className="mt-0.5 truncate text-sm font-bold">{resolvedExamName(form)}</div>
        </div>
        <div className="text-pullim-lemon shrink-0 font-mono text-lg font-bold">{dDayLabel}</div>
      </section>

      {/* 시험명·다짐 — 시간표 배치를 바꾸지 않아 최소 경로에서는 묻지 않는다.
          토글은 이 단계 안에, 여는 필드 바로 위에 둔다(위저드 헤더 고정 자리가 아니라). */}
      {onExpertChange && (
        <button
          type="button"
          onClick={() => onExpertChange(!expert)}
          aria-pressed={expert}
          aria-expanded={expert}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-bold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
            expert
              ? 'bg-pullim-blue-600 border-pullim-blue-600 text-white'
              : 'bg-card border-pullim-slate-200 text-pullim-slate-600 hover:border-pullim-blue-300',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          시험명·다짐 직접 쓰기
        </button>
      )}

      {expert && (
        <section className="border-pullim-slate-200 space-y-3 rounded-xl border border-dashed p-3.5">
          <div>
            <label htmlFor="exam-name" className="text-pullim-slate-700 mb-1 block text-xs font-bold">
              목표 시험명
            </label>
            <input
              id="exam-name"
              type="text"
              value={form.examName}
              onChange={e => setForm({ ...form, examName: e.target.value })}
              placeholder={autoExamName(form)}
              className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>
          <TargetField form={form} setForm={setForm} />
          <div>
            <label htmlFor="motto" className="text-pullim-slate-700 mb-1 block text-xs font-bold">한 줄 다짐</label>
            <input
              id="motto"
              type="text"
              value={form.motto}
              onChange={e => setForm({ ...form, motto: e.target.value })}
              placeholder="예: 영어 빈칸 추론 1등급 사수"
              className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>
        </section>
      )}
    </div>
  );
}

function DateField({ label, value, onChange, min, required }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-pullim-slate-700 mb-1 block text-xs font-bold">
        {label}
        {required && <RequiredMark />}
      </label>
      {/* QA #4 — 커스텀 아이콘 오버레이 제거(네이티브 캘린더 아이콘과 겹침).
          입력 영역 아무 곳이나 클릭해도 네이티브 캘린더가 열리게 showPicker 호출. */}
      <input
        type="date"
        value={value}
        min={min}
        onChange={e => onChange(e.target.value)}
        onClick={e => {
          try { e.currentTarget.showPicker?.(); } catch { /* 미지원 브라우저 — 기본 동작 유지 */ }
        }}
        className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 w-full cursor-pointer rounded-lg border px-3 py-2 text-sm"
      />
    </div>
  );
}

function TargetField({ form, setForm }: Props) {
  const examType = form.examType ?? 'mock';
  const kind = examTypeMeta[examType].targetKind;

  if (kind === 'grade') {
    return (
      <div>
        <label htmlFor="target-grade" className="text-pullim-slate-700 mb-1 block text-xs font-bold">
          목표 등급<RequiredMark />
        </label>
        {/* QA #5 후속 — 입력 자체를 1~8 한 자리로 제한(한글·기호·0·9 타이핑 차단). '등급'은 서픽스로 표기 */}
        <div className="relative">
          <input
            id="target-grade"
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={form.targetGrade}
            onChange={e =>
              setForm({ ...form, targetGrade: e.target.value.replace(/[^1-8]/g, '').slice(0, 1) })
            }
            placeholder="(예) 1"
            className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 w-full rounded-lg border px-3 py-2 pr-12 text-sm outline-none"
          />
          <span aria-hidden className="text-pullim-slate-500 absolute top-1/2 right-3 -translate-y-1/2 text-sm">
            등급
          </span>
        </div>
      </div>
    );
  }

  if (kind === 'score') {
    const score = form.targetScore ?? 90;
    return (
      <div>
        <label className="text-pullim-slate-700 mb-1 block text-xs font-bold">
          목표 점수 <span className="text-pullim-slate-400 font-normal">(100점 만점)</span>
        </label>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <button
            type="button"
            onClick={() => setForm({ ...form, targetScore: Math.max(0, score - 5) })}
            className="border-pullim-slate-200 hover:bg-pullim-slate-50 inline-flex h-9 w-9 items-center justify-center rounded-lg border text-pullim-slate-700 font-bold"
            aria-label="-5점"
          >
            −
          </button>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={score}
            onChange={e => {
              const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
              setForm({ ...form, targetScore: v });
            }}
            className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 w-full rounded-lg border px-3 py-2 text-center text-xl font-mono font-bold text-pullim-blue-700 outline-none"
          />
          <button
            type="button"
            onClick={() => setForm({ ...form, targetScore: Math.min(100, score + 5) })}
            className="border-pullim-slate-200 hover:bg-pullim-slate-50 inline-flex h-9 w-9 items-center justify-center rounded-lg border text-pullim-slate-700 font-bold"
            aria-label="+5점"
          >
            ＋
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[80, 85, 90, 95, 100].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setForm({ ...form, targetScore: p })}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors',
                score === p
                  ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                  : 'border-pullim-slate-200 text-pullim-slate-600 hover:bg-pullim-slate-50',
              )}
            >
              {p}점
            </button>
          ))}
        </div>
      </div>
    );
  }

  // free — 자유 목표에서는 자동 시험명이 이 값에서 파생된다(autoExamName). '자유 목표'로
  // 바꾼 시점의 이름이 그대로 굳지 않도록 목표 입력도 자동 이름 갱신 경로를 태운다.
  // 학생이 '직접 설정'에서 쓴 이름은 withAutoExamName 이 알아서 지켜 준다.
  return (
    <div>
      <label className="text-pullim-slate-700 mb-1 block text-xs font-bold">목표</label>
      <input
        type="text"
        value={form.targetGoal ?? ''}
        onChange={e => setForm(withAutoExamName(form, { ...form, targetGoal: e.target.value }))}
        placeholder="예: 토익 750점, 한자 1급 합격, Pass"
        className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 w-full rounded-lg border px-3 py-2 text-sm outline-none"
      />
    </div>
  );
}

/* ─── Step 2 — 하루 가용 시간 (프리셋 + 미세 조정) ─── */

/**
 * 비슷한 상황 프리셋 — 하루에 몇 시간 쓸지는 자기조절의 핵심 결정이라 기본값 뒤에 숨기지 않고
 * 한 번은 마주보게 한다. 고른 뒤 아래 슬라이더로 세밀하게 조정할 수 있다.
 */
const hourPresets = [
  { key: 'school',  label: '학교만',      weekday: { start: 18, end: 23 }, weekend: { start: 10, end: 22 } },
  { key: 'academy', label: '학원 다녀',   weekday: { start: 21, end: 24 }, weekend: { start: 13, end: 22 } },
  { key: 'self',    label: '자습실 위주', weekday: { start: 16, end: 22 }, weekend: { start: 9,  end: 21 } },
  { key: 'holiday', label: '방학·재수',   weekday: { start: 9,  end: 22 }, weekend: { start: 9,  end: 22 } },
] as const;

const fmtHour = (h: number) => (h === 24 ? '24' : String(h).padStart(2, '0'));

export function PStep2Hours({ form, setForm }: Props) {
  const weekdayDuration = form.weekdayHours.end - form.weekdayHours.start;
  const weekendDuration = form.weekendHours.end - form.weekendHours.start;
  const weeklyTotal = weekdayDuration * 5 + weekendDuration * 2;

  function updateRange(key: 'weekdayHours' | 'weekendHours', side: 'start' | 'end', value: number) {
    const cur = form[key];
    const next = { ...cur, [side]: value };
    if (next.start >= next.end) return;
    setForm({ ...form, [key]: next });
  }

  function applyPreset(p: (typeof hourPresets)[number]) {
    setForm({ ...form, weekdayHours: { ...p.weekday }, weekendHours: { ...p.weekend } });
  }

  return (
    <div className="space-y-4">
      <section>
        <h3 className="text-pullim-slate-700 mb-1.5 text-xs font-bold">비슷한 상황 고르기</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {hourPresets.map(p => {
            // 값이 그대로일 때만 선택 표시 — 미세 조정하면 자동으로 해제된다.
            const selected =
              form.weekdayHours.start === p.weekday.start && form.weekdayHours.end === p.weekday.end &&
              form.weekendHours.start === p.weekend.start && form.weekendHours.end === p.weekend.end;
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={selected}
                onClick={() => applyPreset(p)}
                className={cn(
                  'flex flex-col items-start rounded-xl border-2 p-3 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                  selected
                    ? 'border-pullim-blue-500 bg-pullim-blue-50'
                    : 'border-pullim-slate-200 hover:border-pullim-slate-300',
                )}
              >
                <span className={cn('text-sm font-bold', selected ? 'text-pullim-blue-700' : 'text-pullim-slate-900')}>
                  {p.label}
                </span>
                <span className="text-pullim-slate-500 mt-1 font-mono text-[10px]">
                  평일 {fmtHour(p.weekday.start)}–{fmtHour(p.weekday.end)} · 주말 {fmtHour(p.weekend.start)}–{fmtHour(p.weekend.end)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <HoursRow
          label="평일 (월~금)"
          Icon={BookOpenCheck}
          start={form.weekdayHours.start}
          end={form.weekdayHours.end}
          onStart={v => updateRange('weekdayHours', 'start', v)}
          onEnd={v => updateRange('weekdayHours', 'end', v)}
        />
        <HoursRow
          label="주말 (토·일)"
          Icon={Sunrise}
          start={form.weekendHours.start}
          end={form.weekendHours.end}
          onStart={v => updateRange('weekendHours', 'start', v)}
          onEnd={v => updateRange('weekendHours', 'end', v)}
        />
      </div>

      {/* QA #6·#8 — 연산식 안내·28h 미만 주의 문구 제거. 주간 합계 숫자만 남긴다 */}
      <section className="bg-pullim-slate-50 rounded-xl p-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-pullim-slate-700 font-semibold">주간 학습 가능 시간</span>
          <span className="text-pullim-blue-600 font-mono text-base font-bold">{weeklyTotal}시간</span>
        </div>
      </section>
    </div>
  );
}

function HoursRow({
  label, Icon, start, end, onStart, onEnd,
}: {
  label: string; Icon: LucideIcon; start: number; end: number;
  onStart: (v: number) => void; onEnd: (v: number) => void;
}) {
  const duration = end - start;
  const fmt = (h: number) => h === 24 ? '24:00' : `${String(h).padStart(2, '0')}:00`;
  const startPct = (start / 24) * 100;
  const endPct = (end / 24) * 100;

  return (
    <section className="bg-card border-pullim-slate-200 rounded-xl border p-3.5">
      <header className="mb-3 flex items-center gap-2">
        <Icon aria-hidden className="text-pullim-blue-600 h-4 w-4" />
        <h4 className="text-pullim-slate-900 text-sm font-bold">{label}</h4>
        <span className="text-pullim-blue-700 ml-auto font-mono text-sm font-bold">
          {duration}시간
        </span>
      </header>

      {/* 듀얼 핸들 슬라이더 */}
      <div className="relative h-7">
        {/* 트랙 (배경) — 핸들 18px 폭 보정용 inset 9px */}
        <div
          className="bg-pullim-slate-200 absolute left-[9px] right-[9px] top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          aria-hidden
        />
        {/* 활성 구간 */}
        <div
          className="bg-pullim-blue-500 absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{
            left: `calc(9px + (100% - 18px) * ${startPct / 100})`,
            width: `calc((100% - 18px) * ${(endPct - startPct) / 100})`,
          }}
          aria-hidden
        />
        {/* 시작 핸들 */}
        <input
          type="range"
          min={0}
          max={24}
          step={1}
          value={start}
          onChange={e => {
            const v = Math.min(end - 1, Math.max(0, Number(e.target.value)));
            onStart(v);
          }}
          aria-label={`${label} 시작 시각`}
          className="dual-range absolute inset-0 w-full"
        />
        {/* 종료 핸들 */}
        <input
          type="range"
          min={0}
          max={24}
          step={1}
          value={end}
          onChange={e => {
            const v = Math.max(start + 1, Math.min(24, Number(e.target.value)));
            onEnd(v);
          }}
          aria-label={`${label} 종료 시각`}
          className="dual-range absolute inset-0 w-full"
        />
      </div>

      {/* 시간 라벨 */}
      <div className="mt-2 flex items-center justify-between font-mono">
        <span className="text-pullim-blue-700 text-base font-bold">{fmt(start)}</span>
        <span className="text-pullim-slate-500 text-xs">→</span>
        <span className="text-pullim-blue-700 text-base font-bold">{fmt(end)}</span>
      </div>

      {/* 시간 눈금 */}
      <div className="text-pullim-slate-500 mt-1 flex justify-between font-mono text-[10px]">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </section>
  );
}

/** HMR 안전 — 옛 상태가 노드 id로 저장돼 있으면 라벨로 풀어준다. 새 입력은 라벨 그대로. */
function resolveUnitLabel(unitStringOrId: string): string {
  for (const tree of Object.values(allCurricula)) {
    const node = tree.nodes.find(n => n.id === unitStringOrId);
    if (node) return node.label;
  }
  return unitStringOrId;
}

/* ─── Step 4 — 블록 패턴 ─── */
export function PStep4Pattern({ form, setForm }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(Object.keys(blockPatternMeta) as Array<keyof typeof blockPatternMeta>).map(p => {
          const meta = blockPatternMeta[p];
          const selected = form.blockPattern === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setForm({ ...form, blockPattern: p })}
              className={cn(
                'flex flex-col items-start rounded-xl border-2 p-3 text-left transition-colors',
                selected
                  ? 'border-pullim-blue-500 bg-pullim-blue-50'
                  : 'border-pullim-slate-200 hover:border-pullim-slate-300',
              )}
            >
              <meta.Icon className="text-pullim-blue-600 h-6 w-6" aria-hidden />
              <h4 className={cn('mt-1 text-sm font-bold', selected ? 'text-pullim-blue-700' : 'text-pullim-slate-900')}>
                {meta.label}
              </h4>
              <span className="bg-pullim-slate-100 text-pullim-slate-700 mt-2 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold">
                {meta.spec}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
}

/* ─── Step 5 — 약점 자동 반영 ─── */
/* ─── Step 5 — 루틴(반복 행동) 적용 ─── */
export function PStep5Routine({ form, setForm, routines: routinesProp }: Props & { routines?: Routine[] }) {
  // 실 루틴(컨테이너 주입) 우선, 미주입 시 mock fallback — dev QA #4(실 API 루틴 노출).
  const routines = routinesProp ?? getRoutines();
  const selected = new Set(form.routineIds);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setForm({ ...form, routineIds: [...next] });
  }

  if (routines.length === 0) {
    return (
      <div className="border-pullim-slate-200 bg-pullim-slate-50/50 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center">
        <Repeat2 className="text-pullim-slate-400 h-7 w-7" aria-hidden />
        <p className="text-pullim-slate-700 text-sm font-bold">등록된 루틴이 없어요</p>
        <RoutineLeaveButton className="text-pullim-blue-700 hover:bg-pullim-blue-50 mt-1 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500">
          루틴 관리로
        </RoutineLeaveButton>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {routines.map((r) => {
          const checked = selected.has(r.id);
          const TypeIcon = blockTypeMeta[r.type].Icon;
          return (
            <li key={r.id}>
              <label
                className={cn(
                  'relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-xl border p-3 pl-4 transition-colors',
                  checked
                    ? 'border-pullim-blue-300 bg-pullim-blue-50/50'
                    : 'border-pullim-slate-200 bg-card hover:border-pullim-blue-200',
                )}
              >
                <span className={cn('absolute inset-y-0 left-0 w-1', BLOCK_TYPE_STRIPE[r.type])} aria-hidden />
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(r.id)}
                  className="accent-pullim-blue-600 h-4 w-4 shrink-0"
                  aria-label={`${r.title} 적용`}
                />
                <span className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" aria-hidden>
                  <TypeIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-pullim-slate-900 truncate text-sm font-bold">{r.title}</div>
                  <div className="text-pullim-slate-500 flex flex-wrap items-center gap-x-1.5 text-[11px]">
                    <span>{routineSubjectLabel(r.subject)}</span>
                    <span className="text-pullim-slate-300">·</span>
                    <span className="font-mono">{r.startTime}–{r.endTime}</span>
                    <span className="text-pullim-slate-300">·</span>
                    <span>{formatWeekdays(r.weekdays)}</span>
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
      <RoutineLeaveButton className="text-pullim-blue-700 hover:bg-pullim-blue-50 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500">
        + 루틴 관리
      </RoutineLeaveButton>
    </div>
  );
}

/**
 * 루틴 페이지 이동 확인 버튼 (QA #42) — 위저드 작성 내용이 임시저장되지 않으므로
 * 즉시 이동하는 대신 확인 모달을 거친다. 취소=현재 페이지 잔류, 계속=/planner/routine 이동.
 */
function RoutineLeaveButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">루틴 페이지로 이동할까요?</DialogTitle>
            <DialogDescription className="text-xs">
              현재 페이지에서 작성 중인 내용이 저장되지 않을 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-1.5">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="button" onClick={() => router.push('/planner/routine')}>
              계속
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Step 6 — 약점 자동 반영 ─── */
export function PStep5Weakness({ form, setForm }: Props) {
  const weak = getWeakNodes(0.5).slice(0, 3);

  // 분석 BE 미구현(WEAKNESS_ENABLED off) — mock 약점 목록 대신 출시 예정 예고만.
  // 값은 initialPlannerForm·plannerToForm 에서 false 로 고정돼 저장에 켜진 채 남지 않는다.
  if (!WEAKNESS_ENABLED) {
    return (
      <div className="bg-card border-pullim-slate-200 rounded-xl border border-dashed p-4">
        <div className="text-pullim-blue-600 text-[10px] font-bold tracking-wider uppercase">
          출시 예정
        </div>
        <h4 className="text-pullim-slate-900 mt-0.5 text-sm font-bold">약점 자동 반영 — 준비 중이에요</h4>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="bg-card border-pullim-slate-200 flex items-center justify-between rounded-xl border p-3.5">
        <h4 className="text-pullim-slate-900 text-sm font-bold">약점 자동 반영</h4>
        <input
          type="checkbox"
          checked={form.weaknessAutoReflect}
          onChange={() => setForm({ ...form, weaknessAutoReflect: !form.weaknessAutoReflect })}
          className="h-5 w-9 accent-pullim-blue-600"
        />
      </label>

      {form.weaknessAutoReflect && (
        <>
          <section className="bg-pullim-warn-bg rounded-xl p-3">
            <div className="text-pullim-warn flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
              <AlertCircle className="h-3 w-3" />
              현재 감지된 약점 단원 — 풀림 분석
            </div>
            <ul className="mt-1.5 space-y-1">
              {weak.map(node => (
                <li key={node.id} className="text-pullim-slate-700 flex items-center gap-2 text-[11px]">
                  <span className="bg-pullim-warn h-1.5 w-1.5 rounded-full" />
                  <span className="font-semibold">{node.label}</span>
                  <span className="text-pullim-slate-500 ml-auto font-mono">
                    정복도 {Math.round((node.mastery ?? 0) * 100)}%
                  </span>
                </li>
              ))}
              {weak.length === 0 && (
                <li className="text-pullim-slate-500 text-[11px] italic">현재 약점 없음 — 일반 분배.</li>
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

/* 동기 부여 스타일 선택 UI(`PStep6Motivation`)는 제거했다 — 위저드 어느 단계에서도 열리지
 * 않는데 확인 요약에만 값이 떴다(오너 지적 2026-08-24). `form.motivationStyle` 은 BE 계약이라
 * 기본값 그대로 계속 전송한다. 다시 물으려면 여기 컴포넌트부터 되살린다. */

/* ─── Step 7 — 알림 ─── */
export function PStep7Reminder({ form, setForm }: Props) {
  return (
    <div className="space-y-2">
      {/* 카카오톡 알림 — 발송 API/연동 미구현(kakao는 OAuth 로그인 용도뿐, 알림 발송 백엔드 없음)이라
          동작하지 않는 UI를 숨긴다. 실제 카카오 알림 발송이 연동되면 복원할 것. (dev QA 2026-07-02) */}
      <ToggleRow
        Icon={Smartphone}
        label="앱 푸시"
        value={form.remindPush}
        onToggle={() => setForm({ ...form, remindPush: !form.remindPush })}
      />
      <ToggleRow
        Icon={Bell}
        label="시작 5분 전 미리 알림"
        value={form.remindBefore5min}
        onToggle={() => setForm({ ...form, remindBefore5min: !form.remindBefore5min })}
      />
      {/* 부모 일일 보고만 동의 고지를 남긴다 — 제3자에게 학습 기록이 나가는 유일한 토글이라
          고지 없이 켜지면 안 된다(오너 결정 2026-08-24). 나머지 두 줄의 설명은 복원하지 않는다.
          10px 회색이 아니라 12px + warn 색으로 둔다. */}
      <ToggleRow
        Icon={Users}
        label="부모 일일 보고"
        note="하루 학습 요약이 부모에게 자동 전송돼요. 본인·부모 양측 동의 후에만 켜집니다."
        value={form.parentDailyReport}
        onToggle={() => setForm({ ...form, parentDailyReport: !form.parentDailyReport })}
      />
    </div>
  );
}

function ToggleRow({
  Icon, label, note, value, onToggle,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** 켜기 전에 반드시 읽어야 하는 고지. 없으면 라벨 한 줄만 — 설명용 보조 문구는 두지 않는다. */
  note?: string;
  value: boolean; onToggle: () => void;
}) {
  return (
    <label className="bg-card border-pullim-slate-200 flex cursor-pointer items-center gap-3 rounded-xl border p-3">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          value ? 'bg-pullim-blue-50 text-pullim-blue-600' : 'bg-pullim-slate-100 text-pullim-slate-400',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="text-pullim-slate-900 text-sm font-bold">{label}</h4>
        {note && (
          <p className="text-pullim-warn mt-0.5 text-xs leading-relaxed font-semibold">{note}</p>
        )}
      </div>
      <input
        type="checkbox"
        checked={value}
        onChange={onToggle}
        className="h-5 w-9 accent-pullim-blue-600"
      />
    </label>
  );
}

/* ─── Step 8 — 미리보기 + 활성화 ─── */
/** 학생이 정한 목표만 표기한다 — 묻지 않은 항목을 '미설정'으로 보여주지 않는다. */
function formatTarget(form: PlannerForm): string | null {
  const kind = examTypeMeta[form.examType ?? 'mock'].targetKind;
  if (kind === 'grade') return form.targetGrade?.trim() ? `${form.targetGrade.trim()}등급` : null;
  if (kind === 'score') return `${form.targetScore ?? 0}점`;
  return form.targetGoal?.trim() || null;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const blockTypeIcon: Record<BlockType, LucideIcon> = {
  concept:      BookOpen,
  practice:     PencilLine,
  review:       Target,
  memorize:     Brain,
  mock:         FileText,
  tutor:        MessageCircle,
  self_explain: Mic,
  break:        Coffee,
};

const blockTypeFeatureHint: Record<BlockType, string> = {
  concept:      '풀림 비주얼',
  practice:     '풀림 무한풀기',
  review:       '풀림 복습 (정복)',
  memorize:     '풀림 복습 (단어)',
  mock:         '풀림 무한풀기 (시험 모드)',
  tutor:        '풀림 AI 대화',
  self_explain: '셀프 설명 — 마이크',
  break:        '휴식',
};

const blockTypeShortLabel: Record<BlockType, string> = {
  concept:      '개념',
  practice:     '문제 풀이',
  // BE 생성 라벨(복습·오답)과 정합 — D-14 이내 자동 생성되는 review 를 '약점 보강'으로
  // 부르면 약점 자동 반영 OFF 설정과 모순돼 보인다(Codex).
  review:       '복습·오답',
  memorize:     '암기',
  mock:         '모의 시험',
  tutor:        '개념 질문',
  self_explain: '셀프 설명',
  break:        '휴식',
};

function pad2(n: number): string { return String(n).padStart(2, '0'); }
function fmtHM(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

/** ISO 날짜에 일수 더하기 — UTC 기준이라 timezone에 영향받지 않음 */
function addDaysUTC(iso: string, days: number): { y: number; m: number; d: number; weekday: number } {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth() + 1,
    d: date.getUTCDate(),
    weekday: date.getUTCDay(),
  };
}


function generatePreview(form: PlannerForm, todayISO: string, routines?: Routine[]): PreviewDay[] {
  const subjectKeys = Object.keys(form.subjectUnits ?? {}) as SubjectKey[];
  if (subjectKeys.length === 0) return [];

  // 실 루틴(주입) 있으면 그 맵으로, 없으면 mock findRoutine — dev QA #4.
  const routineMap = routines ? new Map(routines.map((r) => [r.id, r])) : null;

  const blockMinutes =
    form.blockPattern === 'pomodoro' ? 25
    : form.blockPattern === 'focused' ? 50
    : 90;
  const restMinutes =
    form.blockPattern === 'pomodoro' ? 5
    : form.blockPattern === 'focused' ? 10
    : 15;
  const cycleMinutes = blockMinutes + restMinutes;

  const examStart = form.examStartDate || null;
  const examEnd = form.examEndDate || examStart;
  const days: PreviewDay[] = [];

  // BE generateSchedule(pullim-api generate-schedule.ts) 정합 — 과목·단원 순환 커서는
  // 날짜를 넘어 이어진다(인터리빙 + 전 기간 단원 커버리지). 노션 #49 전까지의 근사.
  let subjectCursor = 0;
  const unitCursor: Record<string, number> = {};
  const dayMs = 86_400_000;

  for (let i = 1; i <= 7; i++) {
    const dt = addDaysUTC(todayISO, i);
    const dtISO = `${dt.y}-${pad2(dt.m)}-${pad2(dt.d)}`;
    // 시험 종료일 이후는 미리보기 자체가 없다 — 종료일=오늘이면 빈 하루가 남지 않게
    // 날짜 카드를 만들기 전에 끊는다(Codex). 종료일 당일까지는 push 후 다음 턴에 종료.
    if (examEnd && dtISO > examEnd) break;
    const isWeekend = dt.weekday === 0 || dt.weekday === 6;
    // 범위 시험은 기간(시작~종료) 전체가 시험일 — 둘째 날 이후도 🚩·루틴 노출(Codex).
    const inExamRange = !!examStart && !!examEnd && examStart <= dtISO && dtISO <= examEnd;
    const isExamDay = inExamRange;
    const range = isWeekend ? form.weekendHours : form.weekdayHours;
    const winStart = range.start * 60;
    const winEnd = range.end * 60;

    // 루틴을 먼저 배치 — BE bakeRoutines 정합: 오늘~시험 종료일의 해당 요일에 bake 된다
    // (준비 기간 포함 — 2026-08-03 오너 확정 확대, pullim-api #478). 가용 창 밖·루틴-루틴
    // 겹침은 미리보기 표시에서만 보류(2단계 설정과의 모순 방지 — Codex).
    const routineDay = (dt.weekday + 6) % 7; // jsDay(0=일) → routine weekday(0=월)
    const dayRoutines = form.routineIds
      .map((id) => (routineMap ? routineMap.get(id) : findRoutine(id)))
      .filter((r): r is Routine => !!r);
    const placed = placeRoutinesForDay(dayRoutines, routineDay, winStart, winEnd);
    const routineItems: PreviewItem[] = placed.map((p) => {
      const r = dayRoutines.find((it) => it.id === p.routineId)!;
      return {
        start: p.start, end: p.end,
        subjectLabel: routineSubjectLabel(r.subject),
        type: r.type, unitLabel: r.title, isRoutine: true,
        // 창 밖이면서 겹치기까지 하는 루틴은 **창 사유**를 태그로 쓴다. 태그가 한 줄이라
        // 하나만 고를 수 있는데, 겹침을 풀어도 창 밖이면 여전히 배치되지 않으니 학생이
        // 먼저 손대야 할 쪽은 창이다. 두 사유를 다 적는 자리는 아래 확인 배너다.
        held: p.held ?? (p.overlapping ? '루틴 겹침' : undefined),
      };
    });

    const items: PreviewItem[] = [...routineItems];

    // 생성 블록 — BE 규칙: 가용 창 전체를 슬롯으로 채우고, 유형은 D-day 구간별
    // (D-30+ 개념·암기 / D-15~30 개념·문제 / D-14 이내 문제·복습), 임박 구간 일요일
    // 첫 슬롯은 주 1회 모의(mock). 시험 시작일부터는 생성하지 않는다(BE 는 전날까지).
    if (!examStart || dtISO < examStart) {
      const dday = examStart
        ? Math.round((Date.parse(examStart) - Date.parse(dtISO)) / dayMs)
        : 999; // 시험일 미정 — 평시 유형으로 근사
      const dayTypes: readonly BlockType[] =
        dday > 30 ? ['concept', 'memorize']
        : dday > 14 ? ['concept', 'practice']
        : ['practice', 'review'];
      const mockFirstSlot = dday <= 30 && dt.weekday === 0;

      let slotIdx = 0;
      /**
       * 슬롯 1건을 **소비**한다 — 과목·단원·slotIdx 커서는 `keep=false`(루틴과 겹쳐 버릴
       * 슬롯)에서도 전진하고, `items.push` 만 생략한다.
       *
       * BE `generateSchedule` 은 가용 창을 슬롯으로 전부 채운 **뒤** `excludeOverlapping`
       * 으로 루틴과 겹치는 것을 버린다. 즉 버려진 슬롯도 과목 인터리빙·단원 라운드로빈·
       * 일요일 모의(mock) 판정의 자리를 이미 소비한 상태다. 여기서 겹친 슬롯을 아예
       * 건너뛰면 첫 슬롯이 루틴과 겹칠 때 다음 블록이 두 번째 슬롯이 아니라 첫 번째 슬롯의
       * 메타데이터를 가져와 서버 결과와 과목·단원·유형이 통째로 어긋난다(Codex).
       */
      const takeSlot = (start: number, end: number, keep: boolean) => {
        const subject = subjectKeys[subjectCursor % subjectKeys.length];
        subjectCursor += 1;
        const isMock = mockFirstSlot && slotIdx === 0;
        const type: BlockType = isMock ? 'mock' : dayTypes[slotIdx % dayTypes.length];
        slotIdx += 1;

        // 단원 라운드로빈 — 과목별 커서로 커리큘럼을 순차로 훑는다(모의 블록은 단원 없음).
        let unitLabel = '';
        if (!isMock) {
          const units = form.subjectUnits?.[subject] ?? [];
          if (units.length > 0) {
            const cursor = unitCursor[subject] ?? 0;
            unitLabel = resolveUnitLabel(units[cursor % units.length] ?? '');
            unitCursor[subject] = cursor + 1;
          }
        }

        if (!keep) return; // 버릴 슬롯 — 커서만 전진시키고 화면에는 내보내지 않는다

        items.push({
          start: fmtHM(start), end: fmtHM(end),
          subjectLabel: subjectLabels[subject], type, unitLabel,
        });
      };

      // 격자는 BE `generateSchedule` 과 같다 — 창 시작에서 고정 스텝, 창 끝 잔여는 버림.
      // 미리보기는 **저장 결과의 근사**라서 서버가 만들지 않는 블록을 지어내면 안 된다.
      //
      // 점유 집합만 `busyRanges` 로 바꾼다 — 창을 걸쳐 '보류'로 표기된 루틴도 점유로 센다.
      // BE 는 가용 창과 무관하게 루틴을 굽고(`bakeRoutines`) 겹치는 생성 블록을 버리므로
      // (`excludeOverlapping`), 보류를 점유에서 빼면 서버엔 없는 블록이 화면에만 생긴다.
      const busy = busyRanges(placed);
      for (let t = winStart; t + blockMinutes <= winEnd; t += cycleMinutes) {
        const end = t + blockMinutes;
        takeSlot(t, end, !busy.some(([bs, be]) => t < be && bs < end));
      }
    }

    items.sort((a, b) => a.start.localeCompare(b.start));

    days.push({
      offset: i,
      monthDay: `${dt.m}/${dt.d}`,
      weekdayLabel: WEEKDAY_LABELS[dt.weekday],
      isWeekend,
      isExamDay,
      items,
    });
  }

  return days;
}

export type ConfirmMode = 'create' | 'edit';

type ConfirmProps = {
  form: PlannerForm;
  setForm: (next: PlannerForm) => void;
  /** 학습 범위 확인 게이트 상태 — 활성화 직전 재검증에 쓴다 */
  scope: ScopeState;
  /** 'create' (기본) — 새 시간표 활성화 / 'edit' — 기존 변경 저장 */
  mode?: ConfirmMode;
  /**
   * 활성화·저장 버튼 클릭 시 호출. 부모가 createPlanner / updatePlanner 호출 + redirect 처리.
   * 미주입 시 toast + router.push('/planner') 기본 동작.
   */
  onActivate?: (form: PlannerForm, summary?: ActivateSummary) => void;
  /** 실 루틴(컨테이너 주입) — 미주입 시 mock. 미리보기의 루틴 반영에 사용. */
  routines?: Routine[];
  /**
   * 서버 dry-run 미리보기 로더(컨테이너 주입 — pullim-api #476). 성공 시 휴리스틱 대신
   * 실제 bake 규칙 결과를 표시한다. 미주입(bypass)·실패 시 휴리스틱 폴백.
   */
  onServerPreview?: () => Promise<PreviewDay[] | null>;
  /**
   * 루틴 원본 시각 수정(`PATCH /planner/routines/:routineId`) — 충돌 배너의 '옮기기' 조치용.
   * 미주입이면 그 조치를 노출하지 않는다.
   */
  onUpdateRoutine?: (routineId: string, patch: { startTime: string; endTime: string }) => Promise<void>;
};

/**
 * 활성화 시점의 미리보기 집계 — 완료 화면 리캡용.
 *
 * `source` 가 값의 출처다. `'server'` 는 서버 dry-run(실제 bake 규칙)이라 저장 결과와 같은
 * 엔진이 낸 수치지만, `'local'` 은 `generatePreview()` 휴리스틱 근사다(루틴 처리 등 BE bake 와
 * 규칙이 다를 수 있다). 완료 화면이 확정 문구를 쓸지 예상 문구를 쓸지 여기서 갈린다 (codex).
 */
export type ActivateSummary = {
  previewDays: number;
  previewBlocks: number;
  source: 'server' | 'local';
};

export function PStep4Confirm({
  form, setForm, scope, mode = 'create', onActivate, routines, onServerPreview, onUpdateRoutine,
}: ConfirmProps) {
  const router = useRouter();
  const [previewIdx, setPreviewIdx] = useState(0);
  const weekdayHours = form.weekdayHours.end - form.weekdayHours.start;
  const weekly = weekdayHours * 5 + (form.weekendHours.end - form.weekendHours.start) * 2;

  // 오늘(KST)을 deps에 포함 — 자정 넘겨 열어둔 화면에서도 미리보기가 다음 렌더에 새 날짜로 갱신(Codex).
  const todayIso = todayIsoKst();
  const localPreviews = useMemo(() => generatePreview(form, todayIso, routines), [form, todayIso, routines]);

  // 루틴 목록의 '개정 키' — 서버 dry-run 요청 본문은 루틴 **id 만** 싣고 시각은 서버가 DB 에서
  // 읽는다. 그래서 충돌 배너의 '시간 안쪽으로 옮기기'(`PATCH /planner/routines/:id`)로 원본
  // 시각만 바뀌면 폼도 로더 identity 도 그대로여서, 이 키가 없으면 미리보기가 옮기기 전 시각에
  // 멈춘 채 남는다 — 저장 직전 화면이 실제 저장 결과와 어긋난다(Codex).
  // 배열 참조가 아니라 **배치에 영향을 주는 값(id·시각·요일)만 이은 문자열**에 의존한다 —
  // 호출자가 매 렌더 새 배열을 만들어도 내용이 같으면 재요청이 늘지 않는다.
  const routinesRev = useMemo(
    () => (routines ?? [])
      .map(r => `${r.id}@${r.startTime}-${r.endTime}@${r.weekdays.join('')}`)
      .join('|'),
    [routines],
  );

  // 서버 dry-run(실제 bake 규칙) 우선 — 실패·미주입이면 휴리스틱 폴백. 요청 키가 바뀔 때만 로드.
  // 결과에 요청 키(로더 identity + 날짜 + 루틴 개정)를 함께 저장하고 아래에서 파생으로 걸러 —
  // 이전 폼·이전 날짜·이전 루틴 시각 기준 결과가 잔존하지 않으면서(Codex) effect 내 동기
  // setState 도 피한다(lint). 재요청이 도는 동안에는 휴리스틱 폴백이 새 루틴 시각을 보여준다.
  const [server, setServer] = useState<{
    loader: unknown; day: string; rev: string; days: PreviewDay[];
  } | null>(null);
  useEffect(() => {
    if (!onServerPreview) return;
    let alive = true;
    onServerPreview()
      .then((days) => {
        if (alive && days && days.length > 0) {
          setServer({ loader: onServerPreview, day: todayIso, rev: routinesRev, days });
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [onServerPreview, todayIso, routinesRev]);
  const serverDays =
    server && server.loader === onServerPreview && server.day === todayIso && server.rev === routinesRev
      ? server.days
      : null;
  // 서버 dry-run 은 실제 bake 결과라 선택 루틴이 전부 포함된다(BE 는 가용 창 무관 bake).
  // '보류' 배지는 휴리스틱 폴백 전용 표시 — 서버 경로에선 존재하지 않는 개념.
  const previews = serverDays ?? localPreviews;
  const safeIdx = Math.min(previewIdx, Math.max(0, previews.length - 1));
  const current = previews[safeIdx];
  // 합계는 구간 병합으로 — 루틴-루틴 겹침(BE 허용)을 중복 집계하지 않는다(Codex).
  const totalMinutesToday = useMemo(() => {
    if (!current) return 0;
    const toMin = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
    const spans = current.items
      .filter((it) => !it.held) // 보류 루틴은 실배치 아님 — 합계 제외
      .map((it) => [toMin(it.start), toMin(it.end)] as const)
      .sort((a, b) => a[0] - b[0]);
    let total = 0;
    let start = -1;
    let end = -1;
    for (const [s, e] of spans) {
      if (s > end) {
        if (end > start) total += end - start;
        start = s;
        end = e;
      } else {
        end = Math.max(end, e);
      }
    }
    if (end > start) total += end - start;
    return total;
  }, [current]);

  function activate() {
    // 단계 이동과 같은 규칙으로 재검증한다 — 진행 표시에서 되돌아가 값을 지웠을 수 있다.
    const goal = goalBlocker(form);
    if (goal) {
      toast.error(`1단계 — ${goal}`);
      return;
    }
    const scopeIssue = scopeBlocker(form, scope);
    if (scopeIssue) {
      toast.error(`3단계 — ${scopeIssue}`);
      return;
    }

    if (onActivate) {
      // 완료 화면이 "무엇이 만들어졌는지" 를 숫자로 보여줄 수 있게 미리보기 집계를 함께 넘긴다.
      // 보류 루틴은 실배치가 아니라 제외한다. 출처(source)도 같이 넘겨 휴리스틱 근사를
      // 확정 결과처럼 보여주지 않게 한다.
      onActivate(form, {
        previewDays: previews.length,
        previewBlocks: previews.reduce((n, d) => n + d.items.filter((it) => !it.held).length, 0),
        source: serverDays ? 'server' : 'local',
      });
      return;
    }

    // 기본 동작 (onActivate 미주입 시 — 데모용 fallback)
    toast.success('🎯 플래너 활성화 — 시간표 생성 완료', {
      description: `${form.examName} 기준으로 AI가 시간표 초안을 짰어요.`,
      duration: 3000,
    });
    router.push('/planner');
  }

  const buttonLabel = mode === 'edit' ? '변경 사항 저장' : '플래너 활성화';

  return (
    <div className="space-y-4">
      <section className="bg-pullim-slate-900 rounded-xl p-4 text-white">
        <div className="text-pullim-lemon flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
          <Sparkles className="h-3 w-3" />
          내 플래너 요약
        </div>
        <ul className="text-pullim-slate-300 mt-2 space-y-1 text-[11px]">
          <li>· 목표: <strong className="text-white">{resolvedExamName(form)}</strong> ({examTypeMeta[form.examType ?? 'mock'].label}{form.examStartDate ? ` · ${form.examStartDate}` : ''}{(examTypeMeta[form.examType ?? 'mock'].isRange && form.examEndDate && form.examEndDate !== form.examStartDate) ? ` ~ ${form.examEndDate}` : ''}){formatTarget(form) ? ` — ${formatTarget(form)}` : ''}</li>
          <li>· 주간 학습 가능: <strong className="text-pullim-lemon font-mono">{weekly}시간</strong></li>
          <li>· 학습 범위: <strong className="text-white font-mono">{Object.keys(form.subjectUnits ?? {}).length}개 과목 · {Object.values(form.subjectUnits ?? {}).reduce((a, b) => a + (b?.length ?? 0), 0)}개 단원</strong>{form.weaknessAutoReflect ? ' (+ 약점 단원 자동 — 반영 준비 중)' : ''}</li>
          <li>· 시간 분배: <span className="text-pullim-slate-400">AI 자동 (단원 수 + D-day 기반)</span></li>
          <li>· 블록 패턴: {blockPatternMeta[form.blockPattern].label} <span className="text-pullim-slate-500">({blockPatternMeta[form.blockPattern].spec})</span></li>
          {/* 루틴 게이트 off면 요약에서도 숨긴다 — 고를 수 없는 항목을 '없음'으로 보여주지 않는다 */}
          {ROUTINE_ENABLED && (
            <li>· 선택한 루틴: {form.routineIds.length > 0 ? <strong className="text-white font-mono">{form.routineIds.length}개</strong> : <span className="text-pullim-slate-400">없음</span>}</li>
          )}
          {WEAKNESS_ENABLED && (
            <li>· 약점 자동 반영: {form.weaknessAutoReflect ? 'ON (시간표 반영 준비 중)' : 'OFF'}</li>
          )}
          {/* 리마인더 STEP 게이트(NOTIFICATIONS_ENABLED) off면 요약에서도 알림 줄 숨김 — 기본값(푸시·5분 전)이 남아 오해 주는 것 방지 */}
          {NOTIFICATIONS_ENABLED && (
            <li>· 알림: {[form.remindPush && '푸시', form.remindBefore5min && '5분 전', form.parentDailyReport && '부모 보고'].filter(Boolean).join(', ') || '없음'}</li>
          )}
        </ul>
      </section>

      {/* 루틴 ↔ 학습 가능 시간 충돌 — 서버 미리보기가 뜨는 환경에서도 폼·루틴만으로 판정하므로
          미리보기 소스와 무관하게 항상 정확하다(BE 는 가용 창과 무관하게 bake 한다). */}
      {ROUTINE_ENABLED && routines && (
        <RoutineConflictNotice
          form={form}
          setForm={setForm}
          routines={routines}
          onUpdateRoutine={onUpdateRoutine}
        />
      )}

      {previews.length === 0 ? (
        <section className="bg-pullim-slate-50 flex min-h-[120px] flex-col items-center justify-center rounded-lg p-4 text-center">
          <p className="text-pullim-slate-500 text-xs">
            {Object.keys(form.subjectUnits ?? {}).length === 0
              ? '3단계에서 과목·단원을 추가하면 일주일 미리보기가 자동 생성돼요.'
              : '오늘 이후 표시할 미리보기가 없어요 — 시험이 오늘까지라면 정상이에요.'}
          </p>
        </section>
      ) : (
        <section>
          <header className="flex items-center justify-between gap-2">
            {/* QA #43 — 실 데이터가 아님을 오해하지 않게 '미리보기'로 축약, 하단에 예시 고지 */}
            <h3 className="text-pullim-slate-900 text-sm font-bold">
              미리보기
            </h3>
            <span className="text-pullim-slate-500 font-mono text-[10px]">
              {previews.length}일
            </span>
          </header>

          {/* 일자 칩 */}
          <div role="tablist" aria-label="미리보기 일자" className="mt-2 flex flex-wrap gap-1">
            {previews.map((d, i) => {
              const selected = i === safeIdx;
              return (
                <button
                  key={d.offset}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setPreviewIdx(i)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1',
                    selected
                      ? 'bg-pullim-blue-600 border-pullim-blue-600 text-white'
                      : 'bg-card text-pullim-slate-700 border-pullim-slate-200 hover:border-pullim-blue-300',
                    d.isExamDay && !selected && 'ring-pullim-danger/40 ring-1',
                  )}
                >
                  <span className="font-mono">{d.monthDay}</span>
                  <span className={cn(d.isWeekend && !selected && 'text-pullim-danger')}>
                    {d.weekdayLabel}
                  </span>
                  {d.isExamDay && <span aria-label="시험일">🚩</span>}
                </button>
              );
            })}
          </div>

          {/* 선택된 일자 본문 */}
          {current && (
            <div className="mt-3 rounded-lg border bg-pullim-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="text-pullim-slate-700 font-bold">
                  {current.offset === 0 ? '오늘' : current.offset === 1 ? '내일' : `${current.offset}일 후`} · {current.monthDay} ({current.weekdayLabel}) {current.isWeekend ? '· 주말' : ''}
                </span>
                <span className="text-pullim-slate-500 font-mono">
                  학습 {totalMinutesToday}분 · {current.items.filter(it => !it.held).length}블록
                </span>
              </div>

              {current.isExamDay && (
                <aside className="bg-pullim-danger/10 text-pullim-danger mb-2 inline-flex w-full items-start gap-1.5 rounded-md p-2 text-[11px] font-semibold">
                  <Sparkles aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{form.examName || '시험'} {form.examEndDate && form.examEndDate !== form.examStartDate ? '기간' : '당일'} — AI 학습 블록은 시험 전날까지만 생성되고, 시험 중엔 선택한 루틴만 반영돼요</span>
                </aside>
              )}

              {current.items.length === 0 ? (
                <p className="text-pullim-slate-500 py-2 text-center text-[11px] italic">
                  {current.isExamDay
                    ? '시험 기간에는 AI 학습 블록이 생성되지 않아요.'
                    : '가용 시간이 너무 짧아요. 2단계에서 시간을 늘려보세요.'}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {current.items.map((it, i) => (
                    <PreviewBlock key={i} item={it} />
                  ))}
                </ul>
              )}

              <nav className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPreviewIdx(Math.max(0, safeIdx - 1))}
                  disabled={safeIdx === 0}
                  className="text-pullim-slate-500 hover:text-pullim-blue-700 disabled:cursor-not-allowed disabled:opacity-40 inline-flex items-center gap-0.5 text-[11px] font-semibold"
                >
                  <ChevronLeft className="h-3 w-3" />
                  이전 일
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewIdx(Math.min(previews.length - 1, safeIdx + 1))}
                  disabled={safeIdx === previews.length - 1}
                  className="text-pullim-slate-500 hover:text-pullim-blue-700 disabled:cursor-not-allowed disabled:opacity-40 inline-flex items-center gap-0.5 text-[11px] font-semibold"
                >
                  다음 일
                  <ChevronRight className="h-3 w-3" />
                </button>
              </nav>
            </div>
          )}

          {/* QA #43 고지 — 학생이 보고 있는 게 '실제 계산 결과'인지 '근사'인지 가른다.
              보조 문구 정리(2026-08-24)로 지웠다가 오너 결정으로 복원. 10px 회색이 안 보인다는
              지적이라 색 배너 + 12px 로 바꾼다: 서버 dry-run 은 파랑(확정 규칙),
              휴리스틱 폴백은 warn(예시일 뿐). 색으로도 두 경로가 구분된다. */}
          <aside
            className={cn(
              'mt-2 flex items-start gap-1.5 rounded-lg border p-2 text-xs leading-relaxed',
              serverDays
                ? 'border-pullim-blue-200 bg-pullim-blue-50 text-pullim-slate-700'
                : 'border-pullim-warn/40 bg-pullim-warn-bg text-pullim-slate-700',
            )}
          >
            {serverDays ? (
              <Check className="text-pullim-blue-600 mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <AlertCircle className="text-pullim-warn mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            <span>
              {serverDays ? (
                <>
                  <strong className="text-pullim-slate-900">실제 생성 규칙으로 계산된 미리보기</strong>예요.
                  활성화 시점에 따라 일부 달라질 수 있습니다.
                </>
              ) : (
                <>
                  위 시간표는 <strong className="text-pullim-slate-900">자동 생성 예시</strong>입니다.
                  실제로 구성되는 시간표는 다를 수 있습니다.
                </>
              )}
            </span>
          </aside>
        </section>
      )}

      <TunerPanel form={form} setForm={setForm} routines={routines} />

      <button
        type="button"
        onClick={activate}
        className="bg-pullim-lemon text-pullim-lemon-ink hover:bg-pullim-lemon/90 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold shadow-pullim-md"
      >
        <Check className="h-4 w-4" />
        {buttonLabel}
      </button>
    </div>
  );
}

/* ─── 인라인 조정 패널 ───────────────────────────────────────────
 * 미리보기를 보고 그 자리에서 고친다 — 앞 단계로 되돌아가지 않게.
 * 루틴·약점·알림은 각자의 기능 게이트가 꺼져 있으면 섹션 자체를 내린다(우아한 축소).
 */

function TunerSection({
  title, value, children,
}: {
  title: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="border-pullim-slate-200 bg-card group rounded-xl border">
      <summary className="hover:bg-pullim-slate-50 flex cursor-pointer list-none items-center gap-2 rounded-xl px-3.5 py-2.5">
        <ChevronDown aria-hidden className="text-pullim-slate-400 h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
        <span className="text-pullim-slate-900 text-xs font-bold">{title}</span>
        {value && <span className="text-pullim-slate-500 ml-auto font-mono text-[10px]">{value}</span>}
      </summary>
      <div className="space-y-2 px-3.5 pt-1 pb-3.5">{children}</div>
    </details>
  );
}

function TunerPanel({
  form, setForm, routines,
}: {
  form: PlannerForm;
  setForm: (next: PlannerForm) => void;
  routines?: Routine[];
}) {
  const fmt = (h: number) => (h === 24 ? '24' : String(h).padStart(2, '0'));

  function updateRange(key: 'weekdayHours' | 'weekendHours', side: 'start' | 'end', value: number) {
    const next = { ...form[key], [side]: value };
    if (next.start >= next.end) return;
    setForm({ ...form, [key]: next });
  }

  return (
    <section className="space-y-2">
      {/* 여기 항목 대부분(블록 길이·루틴)은 앞 단계에서 묻지 않은 것이라 '고치는' 자리가
          아니라 '정하는' 자리다 — 제목도 그렇게 부른다(오너 지적 2026-08-24). */}
      <h3 className="text-pullim-slate-700 text-xs font-bold">어떻게 짤지 여기서 정해요</h3>

      <TunerSection
        title="학습 가능 시간"
        value={`평일 ${fmt(form.weekdayHours.start)}–${fmt(form.weekdayHours.end)} · 주말 ${fmt(form.weekendHours.start)}–${fmt(form.weekendHours.end)}`}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <HoursRow
            label="평일 (월~금)"
            Icon={BookOpenCheck}
            start={form.weekdayHours.start}
            end={form.weekdayHours.end}
            onStart={v => updateRange('weekdayHours', 'start', v)}
            onEnd={v => updateRange('weekdayHours', 'end', v)}
          />
          <HoursRow
            label="주말 (토·일)"
            Icon={Sunrise}
            start={form.weekendHours.start}
            end={form.weekendHours.end}
            onStart={v => updateRange('weekendHours', 'start', v)}
            onEnd={v => updateRange('weekendHours', 'end', v)}
          />
        </div>
      </TunerSection>

      <TunerSection title="블록 길이" value={blockPatternMeta[form.blockPattern].spec}>
        <PStep4Pattern form={form} setForm={setForm} />
      </TunerSection>

      {ROUTINE_ENABLED && (
        <TunerSection title="내 루틴" value={`${form.routineIds.length}개 적용`}>
          <PStep5Routine form={form} setForm={setForm} routines={routines} />
        </TunerSection>
      )}

      {/* 알림·약점은 **각자의 기능 게이트로만** 나온다. 1단계 '시험명·다짐 직접 쓰기'(`expert`)에
          묶어 두면 플래그를 켠 환경에서 이 설정들이 4단계에서 사라진 것처럼 보이고, 수정 플로우도
          무관해 보이는 1단계 토글을 찾기 전까지 조정할 수 없다(Codex). 둘 다 기본 차단이라
          기본 상태에서는 여전히 아무것도 렌더하지 않는다. */}
      {NOTIFICATIONS_ENABLED && (
        <TunerSection title="알림">
          <PStep7Reminder form={form} setForm={setForm} />
        </TunerSection>
      )}
      {WEAKNESS_ENABLED && (
        <TunerSection title="약점 자동 반영" value={form.weaknessAutoReflect ? 'ON' : 'OFF'}>
          <PStep5Weakness form={form} setForm={setForm} />
        </TunerSection>
      )}
    </section>
  );
}

function PreviewBlock({ item }: { item: PreviewItem }) {
  const Icon = blockTypeIcon[item.type];
  return (
    <li className={cn(
      'bg-card border-pullim-slate-200 flex items-center gap-2.5 rounded-md border p-2 text-[11px]',
      item.held && 'border-dashed opacity-60',
    )}>
      <span className="text-pullim-slate-500 w-24 shrink-0 font-mono text-[10px]">
        {item.start}–{item.end}
      </span>
      <span className="bg-pullim-blue-50 text-pullim-blue-700 rounded-full px-2 py-0.5 font-bold">
        {item.subjectLabel}
      </span>
      {item.isRoutine && (
        <span className="bg-pullim-slate-100 text-pullim-slate-600 rounded-full px-1.5 py-0.5 text-[9px] font-bold">
          루틴
        </span>
      )}
      {item.held && (
        <span className="bg-pullim-slate-100 text-pullim-slate-500 rounded-full px-1.5 py-0.5 text-[9px] font-bold">
          보류 · {item.held}
        </span>
      )}
      <span className="text-pullim-slate-700 inline-flex items-center gap-1 font-semibold">
        <Icon aria-hidden className="h-3 w-3" />
        {blockTypeShortLabel[item.type]}
      </span>
      <span className="text-pullim-slate-500 ml-auto truncate">
        {item.unitLabel}
        {/* mock 등 단원 없는 블록은 선행 구분자(·)를 숨긴다 */}
        <span className="text-pullim-slate-400">{item.unitLabel ? ' · ' : ''}{blockTypeFeatureHint[item.type]}</span>
      </span>
    </li>
  );
}

