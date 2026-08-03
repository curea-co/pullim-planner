'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, Sparkles, Check, AlertCircle, X, Plus,
  Smartphone, Users, BookOpenCheck, Sunrise,
  Lightbulb, Target, PencilLine, BookOpen, Brain,
  Coffee, FileText, Mic, MessageCircle, ChevronLeft, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { WEAKNESS_ENABLED, NOTIFICATIONS_ENABLED } from '@/lib/flags';
import {
  subjectLabels, type SubjectKey, getWeakNodes, allCurricula,
  type BlockType, type Routine,
  getRoutines, findRoutine, routineSubjectLabel, formatWeekdays, blockTypeMeta,
} from '@/lib/mock';
import { BLOCK_TYPE_STRIPE } from '@/lib/planner/block-type-style';
import {
  type PlannerForm, blockPatternMeta, motivationStyleMeta,
  type ExamType, examTypeMeta, todayIsoKst,
} from './builder-types';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RequiredMark } from '@/components/shell/required-mark';
import { UnitEditorModal } from './unit-editor-modal';
import { Pencil, Repeat2 } from 'lucide-react';

type Props = {
  form: PlannerForm;
  setForm: (next: PlannerForm) => void;
};

// QA #19 — '기타'(etc)는 선택지에서 제거(단원을 채워도 활성화 오류 유발). 기존 플래너에
// 이미 etc가 있으면 step3의 selectedSubjects 폴백으로 계속 표시·편집된다.
const subjectOrder: SubjectKey[] = ['math', 'english', 'korean', 'science', 'social'];

/* ─── Step 1 — 목표 (시험 종류 탭 + 단일/범위 일자) ─── */

const examTypeOrder: ExamType[] = ['mock', 'suneung', 'midterm', 'final', 'other'];

export function PStep1Goal({ form, setForm }: Props) {
  const examType = form.examType ?? 'mock';
  const meta = examTypeMeta[examType];
  // 오늘(KST)은 렌더마다 계산 — 모듈 상수로 캐시하면 자정 이후 min/D-day가 goNext/activate의
  // todayIsoKst() 검증 기준과 어긋난다(Codex). 새 날짜 선택 하한(min)은 신규·수정 공통 오늘부터
  // (사용자 확정 08-03). 검증은 종료일 기준 — 진행 중 범위 시험의 기존 시작일은 유지 가능.
  const todayIso = todayIsoKst();
  const minDate = todayIso;
  const startDate = form.examStartDate ?? '';
  const endDate = form.examEndDate ?? startDate;

  const dDay = useMemo(() => {
    if (!startDate) return null;
    const today = new Date(todayIso);
    const exam = new Date(startDate);
    const diffMs = exam.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [startDate, todayIso]);

  const examLength = useMemo(() => {
    if (!meta.isRange || !startDate || !endDate) return 1;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    return Math.max(1, days);
  }, [meta.isRange, startDate, endDate]);

  function setExamType(t: ExamType) {
    const becomesRange = examTypeMeta[t].isRange;
    setForm({
      ...form,
      examType: t,
      // 범위 → 단일 전환: end를 start와 동일화. 단일 → 범위: end가 비어있으면 start 그대로(1일짜리).
      examEndDate: becomesRange
        ? (form.examEndDate && form.examEndDate >= startDate ? form.examEndDate : startDate)
        : startDate,
    });
  }

  function setStart(v: string) {
    // 범위 시험에서 새 start가 end보다 늦으면 end도 함께 밀어줌
    const nextEnd = meta.isRange
      ? (endDate && endDate >= v ? endDate : v)
      : v;
    setForm({ ...form, examStartDate: v, examEndDate: nextEnd });
  }

  function setEnd(v: string) {
    setForm({ ...form, examEndDate: v < startDate ? startDate : v });
  }

  const dDayLabel =
    dDay === null ? '—'
    : dDay > 0 ? `D-${dDay}`
    : dDay === 0 ? 'D-DAY'
    : `D+${Math.abs(dDay)}`;

  return (
    <div className="space-y-4">
      {/* 시험 종류 탭 */}
      <div role="tablist" aria-label="시험 종류" className="bg-pullim-slate-100 inline-flex w-full items-center gap-0.5 overflow-x-auto rounded-lg p-0.5">
        {examTypeOrder.map(t => {
          const m = examTypeMeta[t];
          const selected = examType === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setExamType(t)}
              className={cn(
                'flex-1 shrink-0 rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap',
                selected
                  ? 'bg-card text-pullim-blue-700 shadow-pullim-sm'
                  : 'text-pullim-slate-600 hover:text-pullim-slate-900',
              )}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* 시험명 */}
      <div>
        <label className="text-pullim-slate-700 mb-1 block text-xs font-bold">
          목표 시험명<RequiredMark />
        </label>
        <input
          type="text"
          value={form.examName}
          onChange={e => setForm({ ...form, examName: e.target.value })}
          placeholder={
            examType === 'suneung'  ? '예: 2026 수능' :
            examType === 'midterm'  ? '예: 1학기 중간고사' :
            examType === 'final'    ? '예: 1학기 기말고사' :
            examType === 'other'    ? '예: 토익 1차 시험' :
                                      '예: 6월 모의평가'
          }
          className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 w-full rounded-lg border px-3 py-2 text-sm outline-none"
        />
      </div>

      {/* 일자 row — 단일 vs 범위. D-day는 날짜 입력 하단에 노출 (QA #4) */}
      <div>
        {meta.isRange ? (
          <div className="grid grid-cols-2 gap-3">
            <DateField label="시험 시작일" required value={startDate} onChange={setStart} min={minDate} />
            <DateField label="시험 종료일" value={endDate} onChange={setEnd} min={startDate || minDate} />
          </div>
        ) : (
          <DateField label="시험 날짜" required value={startDate} onChange={setStart} min={minDate} />
        )}
        <p className="text-pullim-slate-500 mt-1 text-[10px] font-mono">
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
      </div>

      {/* 목표 row — 시험 종류별 분기 */}
      <TargetField form={form} setForm={setForm} />

      <div>
        <label className="text-pullim-slate-700 mb-1 block text-xs font-bold">한 줄 다짐</label>
        <input
          type="text"
          value={form.motto}
          onChange={e => setForm({ ...form, motto: e.target.value })}
          placeholder="예: 영어 빈칸 추론 1등급 사수"
          className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 w-full rounded-lg border px-3 py-2 text-sm outline-none"
        />
      </div>
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

  // free
  return (
    <div>
      <label className="text-pullim-slate-700 mb-1 block text-xs font-bold">목표</label>
      <input
        type="text"
        value={form.targetGoal ?? ''}
        onChange={e => setForm({ ...form, targetGoal: e.target.value })}
        placeholder="예: 토익 750점, 한자 1급 합격, Pass"
        className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 w-full rounded-lg border px-3 py-2 text-sm outline-none"
      />
      <p className="text-pullim-slate-500 mt-1 text-[10px]">
        등급·점수가 없는 시험은 목표를 자유롭게 적어주세요.
      </p>
    </div>
  );
}

/* ─── Step 2 — 가용 시간 ─── */
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

  return (
    <div className="space-y-4">
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

      {/* QA #6·#8 — 연산식 안내·28h 미만 주의 문구 제거 (합계만 노출) */}
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

/* ─── Step 3 — 학습 범위 (read-only 카드 + 모달 편집) ─── */

/** HMR 안전 — 옛 상태가 노드 id로 저장돼 있으면 라벨로 풀어준다. 새 입력은 라벨 그대로. */
function resolveUnitLabel(unitStringOrId: string): string {
  for (const tree of Object.values(allCurricula)) {
    const node = tree.nodes.find(n => n.id === unitStringOrId);
    if (node) return node.label;
  }
  return unitStringOrId;
}

export function PStep3Subjects({ form, setForm }: Props) {
  const unitsObj = form.subjectUnits ?? {};
  // 이미 단원이 있는 과목은 picker 순서에 없어도(예: 기존 한국사) 모두 노출 — 편집 시 데이터 누락 방지
  const selectedSubjects: SubjectKey[] = [
    ...subjectOrder.filter(s => s in unitsObj),
    ...(Object.keys(unitsObj) as SubjectKey[]).filter(s => !subjectOrder.includes(s)),
  ];
  const availableSubjects = subjectOrder.filter(s => !(s in unitsObj));
  const totalUnits = Object.values(unitsObj).reduce((a, b) => a + (b?.length ?? 0), 0);
  const empty = selectedSubjects.length === 0;

  // 모달 — null 닫힘, 'new' 신규 추가(과목 선택부터), SubjectKey 편집
  const [modalTarget, setModalTarget] = useState<SubjectKey | 'new' | null>(null);

  function openAdd() { setModalTarget('new'); }
  function openEdit(s: SubjectKey) { setModalTarget(s); }
  function closeModal() { setModalTarget(null); }

  function removeSubject(s: SubjectKey) {
    const nextU = { ...unitsObj };
    delete nextU[s];
    setForm({ ...form, subjectUnits: nextU });
  }
  function saveUnits(s: SubjectKey, nextUnits: string[]) {
    setForm({ ...form, subjectUnits: { ...unitsObj, [s]: nextUnits } });
  }

  return (
    <div className="space-y-3">
      {/* 진행 상태 카운터 */}
      <div className="text-pullim-slate-700 text-xs font-semibold">
        {empty
          ? '아래에서 과목을 추가해 시작해요'
          : <>
              <span className="text-pullim-blue-700 font-mono">{selectedSubjects.length}</span>개 과목
              <span className="text-pullim-slate-400 mx-1">·</span>
              <span className="text-pullim-blue-700 font-mono">{totalUnits}</span>개 단원 선택됨
            </>}
      </div>

      {/* 과목 카드 grid + 추가 카드 */}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {selectedSubjects.map(s => (
          <SubjectCard
            key={s}
            subject={s}
            selectedUnits={unitsObj[s] ?? []}
            onEdit={() => openEdit(s)}
            onRemove={() => removeSubject(s)}
          />
        ))}
        {availableSubjects.length > 0 && (
          <AddSubjectCard onClick={openAdd} />
        )}
      </ul>

      <aside className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex w-full items-start gap-1.5 rounded-xl p-2.5 text-[11px] leading-relaxed">
        <Lightbulb aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>AI가 초안을 짜면 단원·시간을 자동으로 채워요. <strong>이 단계에서는 시험 범위만 잡아두면</strong> 됩니다. 시간 분배는 단원 수·약점·D-day로 AI가 산정.</span>
      </aside>

      {/* 단원 편집 모달 — 신규 추가도 같은 모달에서 과목 선택 → 단원 설정 */}
      <UnitEditorModal
        open={modalTarget !== null}
        onOpenChange={(o) => { if (!o) closeModal(); }}
        initialSubject={modalTarget === 'new' ? null : modalTarget}
        initialUnits={
          modalTarget && modalTarget !== 'new'
            ? (unitsObj[modalTarget] ?? [])
            : []
        }
        availableSubjects={availableSubjects}
        onSave={saveUnits}
      />
    </div>
  );
}

function SubjectCard({
  subject, selectedUnits, onEdit, onRemove,
}: {
  subject: SubjectKey;
  selectedUnits: string[];
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="bg-card border-pullim-slate-200 flex h-full min-h-[150px] flex-col rounded-xl border p-4">
      {/* 헤더: 과목명 + 단원 카운트 + [수정] + [닫기] */}
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h4 className="text-pullim-slate-900 text-base font-bold">
            {subjectLabels[subject]}
          </h4>
          {selectedUnits.length > 0 && (
            <span className="text-pullim-slate-500 font-mono text-xs">
              · 단원 <span className="text-pullim-blue-700 font-bold">{selectedUnits.length}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="text-pullim-blue-700 hover:bg-pullim-blue-50 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition-colors"
          >
            <Pencil className="h-3 w-3" />
            수정
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`${subjectLabels[subject]} 제거`}
            className="text-pullim-slate-400 hover:bg-pullim-danger-bg hover:text-pullim-danger inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 단원 리스트 (read-only — 편집은 모달에서) */}
      {selectedUnits.length > 0 ? (
        <ul className="space-y-1">
          {selectedUnits.map(u => (
            <li
              key={u}
              className="bg-pullim-slate-50 text-pullim-slate-900 truncate rounded-md px-2.5 py-1.5 text-sm"
            >
              {resolveUnitLabel(u)}
            </li>
          ))}
        </ul>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="text-pullim-slate-500 hover:text-pullim-blue-700 hover:bg-pullim-blue-50 border-pullim-slate-200 hover:border-pullim-blue-300 rounded-md border border-dashed py-3 text-[11px] font-semibold italic transition-colors"
        >
          아직 추가된 단원이 없어요 — 클릭해서 단원 설정
        </button>
      )}
    </li>
  );
}

function AddSubjectCard({ onClick }: { onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="bg-pullim-blue-50/40 border-pullim-blue-200 hover:bg-pullim-blue-50 hover:border-pullim-blue-300 group flex h-full min-h-[150px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-colors"
      >
        <span className="bg-pullim-blue-100 text-pullim-blue-700 group-hover:bg-pullim-blue-200 flex h-10 w-10 items-center justify-center rounded-full transition-colors">
          <Plus className="h-5 w-5" />
        </span>
        <span className="text-pullim-blue-700 text-sm font-bold">과목 추가</span>
        <span className="text-pullim-slate-500 text-[10px]">
          클릭해서 과목·단원 설정
        </span>
      </button>
    </li>
  );
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
              <p className="text-pullim-slate-500 mt-0.5 text-[10px] leading-snug">{meta.description}</p>
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
        <p className="text-pullim-slate-500 text-xs">
          반복하는 행동을 먼저 등록하면 여기서 골라 넣을 수 있어요. (건너뛰어도 돼요)
        </p>
        <RoutineLeaveButton className="text-pullim-blue-700 hover:bg-pullim-blue-50 mt-1 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500">
          루틴 관리로
        </RoutineLeaveButton>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-pullim-slate-500 text-xs">
        이 시간표에 넣을 반복 행동을 골라요. 시간이 맞는 요일은 마지막 단계 미리보기에 들어가요(기존 블록과 겹치면 제외). 건너뛰어도 돼요.
      </p>
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
        <p className="text-pullim-slate-500 mt-1 text-[11px] leading-relaxed">
          풀림 분석이 공부 기록에서 약한 단원을 찾아내면, 시간표를 만들 때 그 단원을
          먼저 배정해 드리는 기능이에요. 열리면 이 단계에서 켤 수 있어요. 지금은
          다음 단계로 넘어가면 돼요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="bg-card border-pullim-slate-200 flex items-center justify-between rounded-xl border p-3.5">
        <div>
          <h4 className="text-pullim-slate-900 text-sm font-bold">약점 자동 반영</h4>
          <p className="text-pullim-slate-500 mt-0.5 text-[11px] leading-relaxed">
            풀림 분석에서 발견한 약점 단원을 플래너에 우선 배정. 끄면 본인이 직접 단원 선택.
          </p>
        </div>
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

/* ─── Step 6 — 동기 부여 스타일 ─── */
export function PStep6Motivation({ form, setForm }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {(Object.keys(motivationStyleMeta) as Array<keyof typeof motivationStyleMeta>).map(s => {
        const meta = motivationStyleMeta[s];
        const selected = form.motivationStyle === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => setForm({ ...form, motivationStyle: s })}
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
            <p className="text-pullim-slate-500 mt-0.5 text-[10px] leading-snug">{meta.description}</p>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Step 7 — 알림 ─── */
export function PStep7Reminder({ form, setForm }: Props) {
  return (
    <div className="space-y-2">
      {/* 카카오톡 알림 — 발송 API/연동 미구현(kakao는 OAuth 로그인 용도뿐, 알림 발송 백엔드 없음)이라
          동작하지 않는 UI를 숨긴다. 실제 카카오 알림 발송이 연동되면 복원할 것. (dev QA 2026-07-02) */}
      <ToggleRow
        Icon={Smartphone}
        label="앱 푸시"
        description="모바일 앱 알림. 가장 즉각적."
        value={form.remindPush}
        onToggle={() => setForm({ ...form, remindPush: !form.remindPush })}
      />
      <ToggleRow
        Icon={Bell}
        label="시작 5분 전 미리 알림"
        description="휴식·이동 시간 확보. 추천."
        value={form.remindBefore5min}
        onToggle={() => setForm({ ...form, remindBefore5min: !form.remindBefore5min })}
      />
      <ToggleRow
        Icon={Users}
        label="부모 일일 보고"
        description="하루 학습 요약을 부모에게 자동 전송. 본인·부모 양측 동의 후 활성."
        value={form.parentDailyReport}
        onToggle={() => setForm({ ...form, parentDailyReport: !form.parentDailyReport })}
      />
    </div>
  );
}

function ToggleRow({
  Icon, label, description, value, onToggle,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string; description: string; value: boolean; onToggle: () => void;
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
        <p className="text-pullim-slate-500 text-[11px] leading-relaxed">{description}</p>
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
function formatTarget(form: PlannerForm): string {
  const kind = examTypeMeta[form.examType ?? 'mock'].targetKind;
  if (kind === 'grade') return form.targetGrade?.trim() ? `${form.targetGrade.trim()}등급` : '미설정';
  if (kind === 'score') return `${form.targetScore ?? 0}점`;
  return form.targetGoal?.trim() || '미설정';
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
  review:       '약점 보강',
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

type PreviewItem = {
  start: string; end: string;
  subjectLabel: string;
  type: BlockType;
  unitLabel: string;
  /** 5단계에서 고른 루틴으로 들어간 블록 */
  isRoutine?: boolean;
  /** 배치 보류 사유 — 숨기지 않고 표기한다(선택 루틴 누락 인지 가능, Codex). */
  held?: '가용 시간 밖' | '루틴 겹침';
};

type PreviewDay = {
  offset: number;          // today + offset (1=내일)
  monthDay: string;        // "4/29"
  weekdayLabel: string;    // "수"
  isWeekend: boolean;
  isExamDay: boolean;
  items: PreviewItem[];
};

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
  const toMin = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
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
    const routineItems: PreviewItem[] = [];
    for (const id of form.routineIds) {
      const r = routineMap ? routineMap.get(id) : findRoutine(id);
      if (!r || !r.weekdays.some(w => w === routineDay)) continue;
      const rs = toMin(r.startTime);
      const re = toMin(r.endTime);
      // 가용 시간(2단계) 밖·루틴-루틴 겹침은 숨기지 않고 '보류'로 표기 — 선택한 루틴이
      // 어떻게 적용되는지 확인하는 화면에서 조용한 누락을 만들지 않는다(Codex).
      const held: PreviewItem['held'] =
        rs < winStart || re > winEnd ? '가용 시간 밖'
        : routineItems.some(it => !it.held && rs < toMin(it.end) && toMin(it.start) < re) ? '루틴 겹침'
        : undefined;
      routineItems.push({
        start: r.startTime, end: r.endTime,
        subjectLabel: routineSubjectLabel(r.subject),
        type: r.type, unitLabel: r.title, isRoutine: true, held,
      });
    }

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
      for (let t = winStart; t + blockMinutes <= winEnd; t += cycleMinutes) {
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

        // 루틴과 겹치는 슬롯은 제외 — 커서는 이미 전진(BE excludeOverlapping 이 생성 후 필터하는 것과 동형)
        const end = t + blockMinutes;
        if (routineItems.some(it => !it.held && t < toMin(it.end) && toMin(it.start) < end)) continue;
        items.push({ start: fmtHM(t), end: fmtHM(end), subjectLabel: subjectLabels[subject], type, unitLabel });
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

export type Step8Mode = 'create' | 'edit';

type Step8Props = {
  form: PlannerForm;
  /** 'create' (기본) — 새 시간표 활성화 / 'edit' — 기존 변경 저장 */
  mode?: Step8Mode;
  /**
   * 활성화·저장 버튼 클릭 시 호출. 부모가 createPlanner / updatePlanner 호출 + redirect 처리.
   * 미주입 시 toast + router.push('/planner') 기본 동작.
   */
  onActivate?: (form: PlannerForm) => void;
  /** 실 루틴(컨테이너 주입) — 미주입 시 mock. 미리보기의 루틴 반영에 사용. */
  routines?: Routine[];
};

export function PStep8Activate({ form, mode = 'create', onActivate, routines }: Step8Props) {
  const router = useRouter();
  const [previewIdx, setPreviewIdx] = useState(0);
  const weekdayHours = form.weekdayHours.end - form.weekdayHours.start;
  const weekly = weekdayHours * 5 + (form.weekendHours.end - form.weekendHours.start) * 2;

  // 오늘(KST)을 deps에 포함 — 자정 넘겨 열어둔 화면에서도 미리보기가 다음 렌더에 새 날짜로 갱신(Codex).
  const todayIso = todayIsoKst();
  const previews = useMemo(() => generatePreview(form, todayIso, routines), [form, todayIso, routines]);
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
    if (!form.examName.trim()) {
      toast.error('1단계에서 시험명을 입력해주세요');
      return;
    }
    if (!form.examStartDate) {
      toast.error('1단계에서 시험 날짜를 선택해주세요');
      return;
    }
    // 계획표는 미래 대상 — 이미 **종료된** 시험 차단. 신규·수정 공통(사용자 확정 08-03).
    // 판정은 종료일 기준(Codex) — 진행 중 범위 시험은 기존 시작일 그대로 저장 가능.
    if ((form.examEndDate || form.examStartDate) < todayIsoKst()) {
      toast.error('이미 지난 시험이에요 — 1단계에서 시험 날짜를 오늘 이후로 선택해주세요');
      return;
    }
    if (examTypeMeta[form.examType ?? 'mock'].targetKind === 'grade') {
      // QA #5 — 목표 등급은 1~8만 허용 (9등급은 목표 점수가 아님)
      const n = parseInt(form.targetGrade, 10);
      if (!Number.isFinite(n) || n < 1 || n > 8) {
        toast.error('1단계에서 목표 등급을 1에서 8 사이의 숫자로 입력해주세요');
        return;
      }
    }
    const units = form.subjectUnits ?? {};
    if (Object.keys(units).length === 0) {
      toast.error('3단계에서 과목과 단원을 1개 이상 추가해주세요');
      return;
    }
    // QA #9 — 단원이 비어 있는 과목이 있으면 활성화 차단 (goNext 방어와 동일 기준)
    const emptySubject = (Object.entries(units) as [SubjectKey, string[]][])
      .find(([, u]) => !u || u.length === 0);
    if (emptySubject) {
      toast.error(`3단계에서 '${subjectLabels[emptySubject[0]] ?? emptySubject[0]}' 과목의 단원을 1개 이상 선택해주세요`);
      return;
    }

    if (onActivate) {
      onActivate(form);
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
          <li>· 목표: <strong className="text-white">{form.examName || '미설정'}</strong> ({examTypeMeta[form.examType ?? 'mock'].label}{form.examStartDate ? ` · ${form.examStartDate}` : ''}{(examTypeMeta[form.examType ?? 'mock'].isRange && form.examEndDate && form.examEndDate !== form.examStartDate) ? ` ~ ${form.examEndDate}` : ''}) — {formatTarget(form)}</li>
          <li>· 주간 학습 가능: <strong className="text-pullim-lemon font-mono">{weekly}시간</strong></li>
          <li>· 학습 범위: <strong className="text-white font-mono">{Object.keys(form.subjectUnits ?? {}).length}개 과목 · {Object.values(form.subjectUnits ?? {}).reduce((a, b) => a + (b?.length ?? 0), 0)}개 단원</strong>{form.weaknessAutoReflect ? ' (+ 약점 단원 자동 — 반영 준비 중)' : ''}</li>
          <li>· 시간 분배: <span className="text-pullim-slate-400">AI 자동 (단원 수 + D-day 기반)</span></li>
          <li>· 블록 패턴: {blockPatternMeta[form.blockPattern].label} <span className="text-pullim-slate-500">({blockPatternMeta[form.blockPattern].spec})</span></li>
          <li>· 선택한 루틴: {form.routineIds.length > 0 ? <strong className="text-white font-mono">{form.routineIds.length}개</strong> : <span className="text-pullim-slate-400">없음</span>} <span className="text-pullim-slate-500">(시간 맞는 요일만 배치 — 가용 시간 밖·겹침은 보류 표기)</span></li>
          <li>· 동기 스타일: {motivationStyleMeta[form.motivationStyle].label}</li>
          <li>· 약점 자동 반영: {form.weaknessAutoReflect ? 'ON (시간표 반영 준비 중)' : 'OFF'}</li>
          {/* 리마인더 STEP 게이트(NOTIFICATIONS_ENABLED) off면 요약에서도 알림 줄 숨김 — 기본값(푸시·5분 전)이 남아 오해 주는 것 방지 */}
          {NOTIFICATIONS_ENABLED && (
            <li>· 알림: {[form.remindPush && '푸시', form.remindBefore5min && '5분 전', form.parentDailyReport && '부모 보고'].filter(Boolean).join(', ') || '없음'}</li>
          )}
        </ul>
      </section>

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
            <span className="text-pullim-slate-500 text-[10px]">
              {previews.length}일 생성 · 최대 7일 미리보기
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
                  {current.offset === 1 ? '내일' : `${current.offset}일 후`} · {current.monthDay} ({current.weekdayLabel}) {current.isWeekend ? '· 주말' : ''}
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

          <p className="text-pullim-slate-500 mt-1.5 text-[10px]">
            위 시간표는 자동 생성 예시입니다. 실제로 구성되는 시간표는 다를 수 있습니다.
          </p>
        </section>
      )}

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

