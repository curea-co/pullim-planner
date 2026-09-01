'use client';

import { useState } from 'react';
import { Lightbulb, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subjectLabels, type SubjectKey } from '@/lib/mock';
import { scopeUnits, subjectScope } from '@/lib/planner/exam-scope';
import { daysBetween } from '@/lib/planner/exam-presets';
import { RequiredMark } from '@/components/shell/required-mark';
import { UnitEditorModal } from './unit-editor-modal';
import {
  isScopeConfirmed, needsElective, todayIsoKst,
  type PlannerForm, type ScopeAnswer, type ScopeState,
} from './builder-types';

type Props = {
  form: PlannerForm;
  setForm: (next: PlannerForm) => void;
  scope: ScopeState;
  setScope: (next: ScopeState) => void;
};

/** 칩 노출 순서 — '기타'는 제외(단원을 채워도 활성화 오류 유발, QA #19). 기존 값은 폴백으로 표시. */
const subjectOrder: SubjectKey[] = ['korean', 'math', 'english', 'science', 'social', 'history'];

/**
 * 게이트 답 + 선택과목에서 파생하는 단원 목록.
 * 범위가 이미 확정된 과목(직접 편집·수정 모드 프리필)은 건드리지 않는다.
 */
function deriveUnits(subject: SubjectKey, scope: ScopeState): string[] {
  // 선택과목을 모르면 범위 자체가 성립하지 않는다 — 고정 단원조차 임의로 채우지 않는다.
  // 채워 두면 학생이 "이미 잡혔네" 하고 넘어가는데, 그 범위는 통째로 틀린 값이다.
  if (needsElective(subject, scope)) return [];
  const all = scopeUnits(subject, scope.electives[subject] ?? []);
  if (scope.answer !== 'progress') return all;
  const cut = scope.progressCut[subject];
  if (!cut) return all;
  const idx = all.indexOf(cut);
  return idx >= 0 ? all.slice(0, idx + 1) : all;
}

function withDerivedUnits(form: PlannerForm, scope: ScopeState): PlannerForm {
  const units = { ...(form.subjectUnits ?? {}) };
  for (const s of Object.keys(units) as SubjectKey[]) {
    // 학생이 확인한 범위(선 확정·직접 편집)는 자동 파생이 덮어쓰지 않는다.
    if (isScopeConfirmed(s, scope)) continue;
    units[s] = deriveUnits(s, scope);
  }
  return { ...form, subjectUnits: units };
}

export function PStep3Subjects({ form, setForm, scope, setScope }: Props) {
  const unitsObj = form.subjectUnits ?? {};
  const selected: SubjectKey[] = [
    ...subjectOrder.filter(s => s in unitsObj),
    ...(Object.keys(unitsObj) as SubjectKey[]).filter(s => !subjectOrder.includes(s)),
  ];
  const totalUnits = Object.values(unitsObj).reduce((a, b) => a + (b?.length ?? 0), 0);
  const pendingChoice = selected.find(s => needsElective(s, scope));

  const [editing, setEditing] = useState<SubjectKey | null>(null);

  /** scope 변경 → 파생 단원 재계산을 한 번에 */
  function commit(nextScope: ScopeState) {
    setScope(nextScope);
    setForm(withDerivedUnits(form, nextScope));
  }

  function toggleSubject(s: SubjectKey) {
    const nextUnits = { ...unitsObj };
    const nextScope: ScopeState = {
      ...scope,
      electives: { ...scope.electives },
      progressCut: { ...scope.progressCut },
      // 뺐다가 다시 넣은 과목은 처음 고른 것과 같아야 한다 — 확인 흔적을 둘 다 지운다.
      settled: scope.settled.filter(x => x !== s),
      manualUnits: scope.manualUnits.filter(x => x !== s),
    };
    if (s in nextUnits) {
      delete nextUnits[s];
      delete nextScope.electives[s];
      delete nextScope.progressCut[s];
    } else {
      nextUnits[s] = [];
    }
    setScope(nextScope);
    setForm(withDerivedUnits({ ...form, subjectUnits: nextUnits }, nextScope));
  }

  /** 선택과목 토글 — 정원을 넘으면 가장 오래된 선택을 밀어낸다(택1이면 곧바로 교체) */
  function toggleElective(s: SubjectKey, key: string) {
    const spec = subjectScope(s);
    const cur = scope.electives[s] ?? [];
    // 정원을 넘기면 가장 오래된 선택을 밀어낸다
    const next = cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key].slice(-spec.choose);
    // 선택과목이 바뀌면 범위가 새로 잡힌다 — 그 과목의 진도 표시는 무효
    const progressCut = { ...scope.progressCut };
    delete progressCut[s];
    commit({ ...scope, electives: { ...scope.electives, [s]: next }, progressCut });
  }

  /**
   * 선택과목 다시 고르기 — 고르면 범위가 새로 잡히고 진도 표시는 초기화된다.
   * 직접 편집 표시도 함께 푼다: 단원 목록 자체가 새로 잡히므로 이전 편집 결과는 남길 수 없다.
   * (자동 범위로 되돌리고 싶을 때 쓰는 유일한 출구이기도 하다.)
   */
  function resetElectives(s: SubjectKey) {
    const progressCut = { ...scope.progressCut };
    delete progressCut[s];
    commit({
      ...scope,
      electives: { ...scope.electives, [s]: [] },
      progressCut,
      settled: scope.settled.filter(x => x !== s),
      manualUnits: scope.manualUnits.filter(x => x !== s),
    });
  }

  function setAnswer(answer: ScopeAnswer) {
    if (scope.answer === answer) return;
    // 답을 바꾸면 범위를 처음부터 다시 정한다 — 이전 답을 전제로 선 확정한 과목(`settled`)은 무효.
    // 단, 자동 범위로 되돌릴 수 없는 과목(`manualUnits`)은 남긴다. 여기서 같이 비우면
    // [단원 직접 편집]으로 저장한 범위나 역추론 불가 프리필을 자동 범위가 덮어쓴다(Codex).
    commit({ ...scope, answer, progressCut: {}, settled: [] });
  }

  function setCut(s: SubjectKey, unit: string) {
    const progressCut = { ...scope.progressCut };
    if (progressCut[s] === unit) delete progressCut[s];
    else progressCut[s] = unit;
    commit({ ...scope, progressCut });
  }

  /**
   * 단원 직접 편집 결과 — 그 과목은 학생이 직접 확정한 것으로 본다.
   * `manualUnits` 에도 남겨 이후 게이트 답이 바뀌어도 이 결과가 살아남게 한다.
   */
  function saveUnits(s: SubjectKey, next: string[]) {
    const nextScope: ScopeState = {
      ...scope,
      settled: scope.settled.includes(s) ? scope.settled : [...scope.settled, s],
      manualUnits: scope.manualUnits.includes(s) ? scope.manualUnits : [...scope.manualUnits, s],
    };
    setScope(nextScope);
    setForm({ ...form, subjectUnits: { ...unitsObj, [s]: next } });
  }

  return (
    <div className="space-y-4">
      {/* 과목 선택 */}
      <section>
        <h3 className="text-pullim-slate-700 mb-1.5 text-xs font-bold">
          과목<RequiredMark />
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {subjectOrder.map(s => {
            const on = s in unitsObj;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => toggleSubject(s)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                  on
                    ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                    : 'border-pullim-slate-200 text-pullim-slate-600 hover:border-pullim-blue-300',
                )}
              >
                {subjectLabels[s]}
              </button>
            );
          })}
        </div>
      </section>

      {selected.length > 0 && <ScopeNote form={form} totalUnits={totalUnits} pending={!!pendingChoice} />}

      {/* 과목 카드 */}
      {selected.length > 0 && (
        <ul className="space-y-2">
          {selected.map(s => (
            <li key={s}>
              {needsElective(s, scope) ? (
                <ElectivePicker
                  subject={s}
                  chosen={scope.electives[s] ?? []}
                  onToggle={key => toggleElective(s, key)}
                  onEscape={() => setEditing(s)}
                  onRemove={() => toggleSubject(s)}
                />
              ) : (
                <SubjectCard
                  subject={s}
                  units={unitsObj[s] ?? []}
                  orderedUnits={scopeUnits(s, scope.electives[s] ?? [])}
                  chosen={scope.electives[s] ?? []}
                  cut={scope.progressCut[s]}
                  manual={scope.manualUnits.includes(s)}
                  showCutPicker={scope.answer === 'progress' && !isScopeConfirmed(s, scope)}
                  onCut={unit => setCut(s, unit)}
                  onEdit={() => setEditing(s)}
                  onResetElectives={() => resetElectives(s)}
                  onRemove={() => toggleSubject(s)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* 확인 게이트 — 선택과목을 다 고른 뒤에만 묻는다(순서 강제) */}
      {selected.length > 0 && !pendingChoice && (
        <ScopeGate answer={scope.answer} onAnswer={setAnswer} />
      )}

      <UnitEditorModal
        open={editing !== null}
        onOpenChange={o => { if (!o) setEditing(null); }}
        initialSubject={editing}
        initialUnits={editing ? (unitsObj[editing] ?? []) : []}
        availableSubjects={[]}
        onSave={saveUnits}
      />
    </div>
  );
}

/* ─── 시스템이 아는 것 / 모르는 것 안내 ─── */

function ScopeNote({ form, totalUnits, pending }: { form: PlannerForm; totalUnits: number; pending: boolean }) {
  const weekly =
    (form.weekdayHours.end - form.weekdayHours.start) * 5 +
    (form.weekendHours.end - form.weekendHours.start) * 2;
  const dday = form.examStartDate ? daysBetween(todayIsoKst(), form.examStartDate) : null;
  const budget = dday && dday > 0 ? Math.round((weekly * dday) / 7) : null;
  const perUnit = budget && totalUnits > 0 ? Math.round((budget / totalUnits) * 10) / 10 : null;

  return (
    <aside className="bg-pullim-blue-50 text-pullim-blue-700 flex w-full items-start gap-1.5 rounded-xl p-2.5 text-[length:var(--text-xs)] leading-relaxed">
      <Lightbulb aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {pending ? (
          <>
            <strong>여기서 시스템이 아는 건 교육과정 구조뿐이에요.</strong> 어떤 선택과목을 듣는지는
            기록에 없어서 추측할 수 없어요. 아래에서 알려주면 그때부터 범위를 잡습니다.
          </>
        ) : (
          <>
            시험 범위는 네가 정하고, 그 안에서 <strong>뭘 먼저 볼지는 AI가</strong> 단원 수·D-day로 정해요.
            {perUnit !== null && (
              <> 지금 범위는 단원당 약 <strong className="font-mono">{perUnit}시간</strong>
                {perUnit < 2 ? ' — 좀 빠듯합니다.' : '씩 쓸 수 있어요.'}</>
            )}
          </>
        )}
      </span>
    </aside>
  );
}

/* ─── 선택과목 ─── */

function ElectivePicker({
  subject, chosen, onToggle, onEscape, onRemove,
}: {
  subject: SubjectKey;
  chosen: string[];
  onToggle: (key: string) => void;
  onEscape: () => void;
  onRemove: () => void;
}) {
  const spec = subjectScope(subject);
  return (
    <section className="border-pullim-danger/30 bg-card rounded-xl border p-3.5">
      <header className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h4 className="text-pullim-slate-900 text-sm font-bold">{subjectLabels[subject]}</h4>
          <span className="bg-pullim-danger/10 text-pullim-danger rounded-full px-2 py-0.5 text-[length:var(--text-xs)] font-bold">
            선택과목을 골라줘
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${subjectLabels[subject]} 제거`}
          className="text-pullim-slate-400 hover:bg-pullim-danger-bg hover:text-pullim-danger inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <h5 className="text-pullim-slate-700 mb-2 text-xs font-bold">{spec.prompt}</h5>
      <div className="flex flex-wrap gap-1.5">
        {spec.options.map(o => {
          const on = chosen.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o.key)}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                on
                  ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                  : 'border-pullim-slate-200 text-pullim-slate-700 hover:border-pullim-blue-300',
              )}
            >
              {o.key}
            </button>
          );
        })}
        {/* 교육과정 데이터에 없는 과목(2022 개정 등)으로 막히지 않게 하는 우회로 */}
        <button
          type="button"
          onClick={onEscape}
          className="border-pullim-slate-200 text-pullim-slate-600 hover:border-pullim-blue-300 rounded-lg border border-dashed px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          목록에 없어 · 직접 고를래
        </button>
      </div>
    </section>
  );
}

/* ─── 과목 카드 ─── */

function SubjectCard({
  subject, units, orderedUnits, chosen, cut, manual, showCutPicker,
  onCut, onEdit, onResetElectives, onRemove,
}: {
  subject: SubjectKey;
  units: string[];
  orderedUnits: string[];
  chosen: string[];
  cut?: string;
  /** 자동 범위로 되돌릴 수 없는 과목(직접 편집·역추론 불가 프리필) — 안 덮어쓴다는 걸 배지로 알린다 */
  manual: boolean;
  showCutPicker: boolean;
  onCut: (unit: string) => void;
  onEdit: () => void;
  onResetElectives: () => void;
  onRemove: () => void;
}) {
  const preview = units.slice(0, 6);
  const rest = units.length - preview.length;

  return (
    <section className="bg-card border-pullim-slate-200 rounded-xl border p-3.5">
      <header className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h4 className="text-pullim-slate-900 text-sm font-bold">{subjectLabels[subject]}</h4>
          {chosen.map(c => (
            <span key={c} className="bg-pullim-blue-50 text-pullim-blue-700 rounded-full px-2 py-0.5 text-[length:var(--text-xs)] font-bold">
              {c}
            </span>
          ))}
          {chosen.length > 0 && (
            <button
              type="button"
              onClick={onResetElectives}
              className="text-pullim-slate-500 hover:text-pullim-blue-700 text-[length:var(--text-xs)] font-bold underline-offset-2 hover:underline"
            >
              바꾸기
            </button>
          )}
          <span className="text-pullim-slate-500 font-mono text-[length:var(--text-xs)]">
            {units.length}단원
          </span>
          {manual && (
            <span className="bg-pullim-slate-100 text-pullim-slate-600 rounded-full px-2 py-0.5 text-[length:var(--text-xs)] font-bold">
              직접 정한 범위
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="text-pullim-blue-700 hover:bg-pullim-blue-50 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[length:var(--text-xs)] font-bold transition-colors"
          >
            <Pencil className="h-3 w-3" />
            단원 직접 편집
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

      {showCutPicker ? (
        <>
          <h5 className="text-pullim-slate-700 mb-1.5 text-xs font-bold">마지막으로 배운 단원</h5>
          <ul className="flex flex-wrap gap-1">
            {orderedUnits.map((u, i) => {
              const cutIdx = cut ? orderedUnits.indexOf(cut) : -1;
              const isCut = u === cut;
              const after = cutIdx >= 0 && i > cutIdx;
              return (
                <li key={u}>
                  <button
                    type="button"
                    aria-pressed={isCut}
                    onClick={() => onCut(u)}
                    className={cn(
                      'rounded-md border px-2 py-1 text-[length:var(--text-xs)] transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                      isCut
                        ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700 font-bold'
                        : after
                          ? 'border-pullim-slate-100 text-pullim-slate-300'
                          : 'border-pullim-slate-200 text-pullim-slate-700 hover:border-pullim-blue-300',
                    )}
                  >
                    {u}{isCut && ' 까지'}
                  </button>
                </li>
              );
            })}
          </ul>
          {orderedUnits.length === 0 && (
            <p className="text-pullim-slate-500 text-[length:var(--text-xs)] italic">
              교육과정 목록이 없어요 — [단원 직접 편집]에서 직접 적어주세요.
            </p>
          )}
        </>
      ) : units.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
          {preview.map(u => (
            <li key={u} className="bg-pullim-slate-50 text-pullim-slate-700 rounded-md px-2 py-1 text-[length:var(--text-xs)]">
              {u}
            </li>
          ))}
          {rest > 0 && (
            <li className="text-pullim-slate-500 rounded-md px-2 py-1 font-mono text-[length:var(--text-xs)]">+{rest}</li>
          )}
        </ul>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="text-pullim-slate-500 hover:text-pullim-blue-700 hover:bg-pullim-blue-50 border-pullim-slate-200 hover:border-pullim-blue-300 w-full rounded-md border border-dashed py-2.5 text-[length:var(--text-xs)] font-semibold italic transition-colors"
        >
          단원이 비어 있어요 — 클릭해서 직접 설정
        </button>
      )}
    </section>
  );
}

/* ─── 확인 게이트 ─── */

const GATE_OPTIONS: { key: ScopeAnswer; label: string }[] = [
  { key: 'all', label: '전 범위 다 해야 해' },
  { key: 'progress', label: '진도 나간 데까지' },
  { key: 'custom', label: '시험 범위가 따로 있어' },
];

function ScopeGate({ answer, onAnswer }: {
  answer: ScopeAnswer | null;
  onAnswer: (a: ScopeAnswer) => void;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border p-3.5 transition-colors',
        answer ? 'border-pullim-slate-200 bg-card' : 'border-pullim-danger/30 bg-pullim-danger/5',
      )}
    >
      <header className="mb-2">
        <h4 className="text-pullim-slate-900 text-sm font-bold">
          학교 진도는 어디까지 나갔어?<RequiredMark />
        </h4>
      </header>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        {GATE_OPTIONS.map(o => {
          const on = answer === o.key;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              onClick={() => onAnswer(o.key)}
              className={cn(
                'flex flex-col items-start rounded-lg border p-2.5 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                on
                  ? 'border-pullim-blue-500 bg-pullim-blue-50'
                  : 'border-pullim-slate-200 hover:border-pullim-blue-300',
              )}
            >
              <span className={cn('text-xs font-bold', on ? 'text-pullim-blue-700' : 'text-pullim-slate-900')}>
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
