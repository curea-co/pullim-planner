'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, BookOpenCheck, ChevronRight, Flame, ListChecks, Plus, Search, Sparkles, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  allCurricula, subjectLabels, type CurriculumNode, type SubjectKey,
} from '@/lib/mock';
import { WEAKNESS_ENABLED } from '@/lib/flags';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 편집 시작 시점의 과목 — null이면 모달이 과목 선택부터 시작 (신규 추가). */
  initialSubject: SubjectKey | null;
  /** 편집 시작 시점의 단원 (편집 모드 pre-fill, 신규는 빈 배열). */
  initialUnits: string[];
  /** 신규 추가 모드에서 선택 가능한 과목 목록. */
  availableSubjects: SubjectKey[];
  /** 적용 시 호출 — subject 단위로 단원 배열을 업서트. */
  onSave: (subject: SubjectKey, units: string[]) => void;
};

/**
 * 단원 편집 모달.
 * - initialSubject가 있으면 → 곧바로 단원 편집 뷰
 * - initialSubject가 null이면 → 과목 선택 뷰부터 시작 → 선택 후 단원 편집
 *
 * 과목·단원 모두 모달 안에서 batch 편집. 취소 시 변경 무시.
 */
export function UnitEditorModal({
  open, onOpenChange,
  initialSubject, initialUnits, availableSubjects,
  onSave,
}: Props) {
  const [pickedSubject, setPickedSubject] = useState<SubjectKey | null>(initialSubject);
  const [pending, setPending] = useState<string[]>([...initialUnits]);
  const [search, setSearch] = useState('');
  const [customInput, setCustomInput] = useState('');
  // 기타(etc) 과목 전용 — 과목명 직접 입력 (단원명은 customInput 재사용)
  const [etcName, setEtcName] = useState('');

  // 모달이 열릴 때 또는 props가 바뀔 때 — render 중 보정 (React idiom)
  const [openSnap, setOpenSnap] = useState(open);
  const [subjectSnap, setSubjectSnap] = useState(initialSubject);
  const [unitsSnap, setUnitsSnap] = useState(initialUnits);
  if (open !== openSnap || initialSubject !== subjectSnap || initialUnits !== unitsSnap) {
    setOpenSnap(open);
    setSubjectSnap(initialSubject);
    setUnitsSnap(initialUnits);
    if (open) {
      setPickedSubject(initialSubject);
      setPending([...initialUnits]);
      setSearch('');
      setCustomInput('');
      setEtcName('');
    }
  }

  // 과목 선택 모드 (신규 + 아직 안 골랐을 때)
  const inPickerMode = pickedSubject === null;
  const isNewMode = initialSubject === null;

  const { allDepth2, allDepth3, defaultSource } = useMemo(() => {
    if (!pickedSubject) return { allDepth2: [], allDepth3: [], defaultSource: null };
    const tree = allCurricula[pickedSubject as keyof typeof allCurricula];
    return {
      allDepth2: tree?.nodes.filter(n => n.depth === 2) ?? [],
      allDepth3: tree?.nodes.filter(n => n.depth === 3) ?? [],
      defaultSource: tree?.defaultSource ?? null,
    };
  }, [pickedSubject]);

  // 약점 자동 추천은 분석(mastery) BE 미구현 — 학습 데이터 누적 후 개발 예정이라
  // WEAKNESS_ENABLED off(기본)면 섹션 자체를 숨긴다(mock 정복도 노출 방지, 07-10 QA).
  const weakNodes = WEAKNESS_ENABLED
    ? allDepth3.filter(n => (n.mastery ?? 1) < 0.5)
    : [];

  // 코스별 그룹화 — 트리 정의 순서 그대로 (공통 → Ⅰ → Ⅱ → 미적분 → ...)
  const courseList = useMemo(() => {
    const map = new Map<string, CurriculumNode[]>();
    for (const n of allDepth2) {
      const c = n.course ?? '기타';
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(n);
    }
    return Array.from(map.entries());
  }, [allDepth2]);

  const lowered = search.trim().toLowerCase();
  const matchesSearch = (label: string) => !lowered || label.toLowerCase().includes(lowered);

  function pickSubject(s: SubjectKey) {
    setPickedSubject(s);
    setPending([]);
    setSearch('');
    setCustomInput('');
    setEtcName('');
  }

  function backToPicker() {
    setPickedSubject(null);
    setPending([]);
    setSearch('');
    setCustomInput('');
    setEtcName('');
  }

  function toggle(label: string) {
    setPending(p => (p.includes(label) ? p.filter(x => x !== label) : [...p, label]));
  }
  function removeFromPending(label: string) {
    setPending(p => p.filter(x => x !== label));
  }
  function addCustom() {
    const v = customInput.trim();
    if (!v) return;
    // 기타 과목은 "과목명 · 단원명"으로 결합(과목명 비면 단원명만)
    const label = pickedSubject === 'etc' && etcName.trim() ? `${etcName.trim()} · ${v}` : v;
    if (!pending.includes(label)) setPending(p => [...p, label]);
    setCustomInput('');
  }
  function reset() {
    setPending([]);
  }

  function save() {
    if (!pickedSubject) return;
    onSave(pickedSubject, pending);
    onOpenChange(false);
  }

  // pending 중 교과 트리에 없는 항목 (자유 입력)
  const knownLabels = new Set(allDepth2.map(n => n.label).concat(allDepth3.map(n => n.label)));
  const customPending = pending.filter(p => !knownLabels.has(p));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="border-pullim-slate-200 flex-row items-start gap-2 border-b p-5 pb-4">
          <div className="min-w-0 flex-1">
            {inPickerMode ? (
              <>
                <DialogTitle className="text-pullim-slate-900 text-base font-bold tracking-tight">
                  과목 추가
                </DialogTitle>
                <DialogDescription className="text-pullim-slate-500 mt-1 text-xs leading-relaxed">
                  어떤 과목을 추가할까요? 선택하면 단원을 설정할 수 있어요.
                </DialogDescription>
              </>
            ) : (
              <>
                <DialogTitle className="text-pullim-slate-900 inline-flex items-center gap-2 text-base font-bold tracking-tight">
                  {isNewMode && (
                    <button
                      type="button"
                      onClick={backToPicker}
                      className="text-pullim-slate-500 hover:bg-pullim-slate-100 -ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                      aria-label="과목 다시 선택"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  {subjectLabels[pickedSubject!]} — 단원 설정
                </DialogTitle>
                <DialogDescription className="text-pullim-slate-500 mt-1 text-xs leading-relaxed">
                  {pickedSubject === 'etc'
                    ? '과목명·단원명을 직접 입력해요.'
                    : WEAKNESS_ENABLED
                      ? '교과 단원 / 자유 입력 모두 가능. 약점 단원 자동 추천.'
                      : '교과 단원 / 자유 입력 모두 가능.'}
                  <span className="text-pullim-blue-700 ml-1 font-mono font-bold">{pending.length}</span>
                  <span className="text-pullim-slate-500"> 단원 선택됨</span>
                </DialogDescription>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="닫기"
            className="text-pullim-slate-400 hover:bg-pullim-slate-100 -mr-2 -mt-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {/* 본문 — 과목 선택 OR 단원 편집 */}
        {inPickerMode ? (
          <SubjectPickerBody available={availableSubjects} onPick={pickSubject} />
        ) : pickedSubject === 'etc' ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="space-y-1.5">
              <label htmlFor="etc-subject" className="text-pullim-slate-700 block text-xs font-bold">과목명</label>
              <input
                id="etc-subject"
                type="text"
                value={etcName}
                onChange={e => setEtcName(e.target.value)}
                placeholder="예: 제2외국어, 한문, 직업탐구"
                className="border-pullim-slate-200 focus:border-pullim-blue-400 w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="etc-unit" className="text-pullim-slate-700 block text-xs font-bold">단원명</label>
              <div className="flex items-stretch gap-2">
                <input
                  id="etc-unit"
                  type="text"
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                  placeholder="예: 히라가나 1과"
                  className="border-pullim-slate-200 focus:border-pullim-blue-400 flex-1 rounded-lg border bg-card px-3 py-2 text-sm outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={addCustom}
                  disabled={!customInput.trim()}
                  className="bg-pullim-blue-600 hover:bg-pullim-blue-700 disabled:bg-pullim-slate-200 disabled:text-pullim-slate-400 disabled:cursor-not-allowed inline-flex shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-bold text-white transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  추가
                </button>
              </div>
            </div>
            {pending.length > 0 && (
              <ul className="space-y-1">
                {pending.map(label => (
                  <li
                    key={label}
                    className="bg-pullim-slate-50 border-pullim-slate-200 flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5"
                  >
                    <span className="text-pullim-slate-900 truncate text-sm">{label}</span>
                    <button
                      type="button"
                      onClick={() => removeFromPending(label)}
                      aria-label={`${label} 제거`}
                      className="text-pullim-slate-400 hover:text-pullim-danger inline-flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {/* 검색 */}
            <label className="bg-pullim-slate-50 border-pullim-slate-200 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <Search className="text-pullim-slate-400 h-4 w-4" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="단원 검색…"
                className="flex-1 bg-transparent outline-none placeholder:text-pullim-slate-400"
              />
            </label>

            {/* 직접 입력으로 추가된 항목 */}
            {customPending.length > 0 && (
              <section>
                <h4 className="text-pullim-slate-700 mb-2 inline-flex items-center gap-1 text-[length:var(--text-xs)] font-bold tracking-wider uppercase">
                  <Sparkles aria-hidden className="h-3 w-3" />
                  직접 입력 ({customPending.length})
                </h4>
                <ul className="space-y-1">
                  {customPending.filter(matchesSearch).map(label => (
                    <li
                      key={label}
                      className="bg-pullim-blue-50 border-pullim-blue-100 flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5"
                    >
                      <span className="text-pullim-slate-900 truncate text-sm">{label}</span>
                      <button
                        type="button"
                        onClick={() => removeFromPending(label)}
                        aria-label={`${label} 제거`}
                        className="text-pullim-slate-400 hover:text-pullim-danger inline-flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 약점 자동 추천 */}
            {weakNodes.length > 0 && (
              <section>
                <h4 className="text-pullim-warn mb-2 inline-flex items-center gap-1 text-[length:var(--text-xs)] font-bold tracking-wider uppercase">
                  <Flame className="h-3 w-3" />
                  내 약점에서 자동 추천 (분석 연동)
                </h4>
                <ul className="space-y-1">
                  {weakNodes.filter(n => matchesSearch(n.label)).map(n => (
                    <UnitCheckRow
                      key={n.id}
                      label={n.label}
                      selected={pending.includes(n.label)}
                      onToggle={() => toggle(n.label)}
                      badge={`정복도 ${Math.round((n.mastery ?? 0) * 100)}%`}
                      badgeTone="warn"
                    />
                  ))}
                </ul>
              </section>
            )}

            {/* 코스별 단원 — 트리 정의 순서 (공통 → Ⅰ → Ⅱ → 미적분 → 진로 → 수능 영역) */}
            {courseList.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-pullim-slate-700 inline-flex items-center gap-1 text-[length:var(--text-xs)] font-bold tracking-wider uppercase">
                  <BookOpenCheck aria-hidden className="h-3 w-3" />
                  코스별 단원
                </h4>
                {courseList.map(([course, nodes]) => {
                  const filtered = nodes.filter(n => matchesSearch(n.label));
                  if (filtered.length === 0 && lowered) return null;
                  const hasSelected = pending.some(p => nodes.some(n => n.label === p));
                  return (
                    <details
                      key={course}
                      open={!!lowered || hasSelected}
                      className="border-pullim-slate-200 group bg-card rounded-lg border"
                    >
                      <summary className="hover:bg-pullim-slate-50 flex cursor-pointer items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold list-none">
                        <ChevronRight className="text-pullim-slate-400 h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" />
                        <span className="text-pullim-slate-900">{course}</span>
                        <span className="text-pullim-slate-500 ml-1 font-mono text-[length:var(--text-2xs)]">
                          ({pending.filter(p => nodes.some(n => n.label === p)).length}/{nodes.length})
                        </span>
                      </summary>
                      <ul className="space-y-1 px-3 pb-3 pt-1">
                        {filtered.map(n => (
                          <UnitCheckRow
                            key={n.id}
                            label={n.label}
                            selected={pending.includes(n.label)}
                            onToggle={() => toggle(n.label)}
                          />
                        ))}
                      </ul>
                    </details>
                  );
                })}
              </section>
            )}

            {/* 직접 입력 */}
            <section>
              <h4 className="text-pullim-slate-700 mb-2 inline-flex items-center gap-1 text-[length:var(--text-xs)] font-bold tracking-wider uppercase">
                <Plus className="h-3 w-3" />
                직접 입력 (수능특강·학원 자체 교재 등)
              </h4>
              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustom();
                    }
                  }}
                  placeholder="예: 수능특강 영어 3강, 내신 기출 5개년"
                  className="border-pullim-slate-200 focus:border-pullim-blue-400 focus:bg-pullim-blue-50 flex-1 rounded-md border bg-card px-2.5 py-1.5 text-sm outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={addCustom}
                  disabled={!customInput.trim()}
                  className="bg-pullim-blue-600 hover:bg-pullim-blue-700 disabled:bg-pullim-slate-200 disabled:text-pullim-slate-400 disabled:cursor-not-allowed inline-flex shrink-0 items-center gap-1 rounded-md px-3 text-xs font-bold text-white transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  추가
                </button>
              </div>
            </section>

            {courseList.length === 0 && weakNodes.length === 0 && customPending.length === 0 && (
              <p className="text-pullim-slate-500 py-4 text-center text-xs italic">
                교과 단원 데이터 없음 — 위에서 직접 입력해주세요
              </p>
            )}

            {/* 출처 footer */}
            {defaultSource && (
              <div className="border-pullim-slate-100 mt-4 border-t pt-3 text-[length:var(--text-xs)] leading-relaxed text-pullim-slate-500">
                <span className="inline-flex items-center gap-1 font-bold tracking-wider uppercase">
                  <ListChecks aria-hidden className="h-3 w-3" />
                  출처
                </span>
                <span className="ml-1">교육부 고시 교육과정</span>
                {defaultSource.url && (
                  <span className="text-pullim-slate-400"> · {defaultSource.url}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 푸터 — picker 모드에서는 [닫기]만, 편집 모드에서는 [초기화] [취소] [적용] */}
        <DialogFooter className="border-pullim-slate-200 bg-pullim-slate-50 m-0 flex-row items-center justify-between gap-2 rounded-none border-t px-5 py-3">
          {inPickerMode ? (
            <>
              <span className="text-pullim-slate-500 text-[length:var(--text-xs)]">
                과목 선택 후 단원을 설정해요
              </span>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                닫기
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={reset}
                className="text-pullim-slate-500 hover:text-pullim-danger text-[length:var(--text-xs)] font-semibold underline-offset-2 hover:underline"
              >
                전체 초기화
              </button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  취소
                </Button>
                <Button size="sm" onClick={save}>
                  적용 ({pending.length}단원)
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubjectPickerBody({
  available, onPick,
}: {
  available: SubjectKey[];
  onPick: (s: SubjectKey) => void;
}) {
  if (available.length === 0) {
    return (
      <div className="flex-1 p-5">
        <p className="text-pullim-slate-500 py-8 text-center text-sm">
          모든 과목이 이미 추가됐어요. 단원만 수정하려면 카드의 [수정]을 사용하세요.
        </p>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto p-5">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {available.map(s => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="bg-card border-pullim-slate-200 hover:border-pullim-blue-400 hover:bg-pullim-blue-50 group flex w-full items-center gap-2.5 rounded-lg border p-3 text-left transition-colors"
            >
              <span className="bg-pullim-blue-50 text-pullim-blue-700 group-hover:bg-pullim-blue-100 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors">
                <BookOpen className="h-4 w-4" />
              </span>
              <span className="text-pullim-slate-900 group-hover:text-pullim-blue-700 text-sm font-bold">
                {subjectLabels[s]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UnitCheckRow({
  label, selected, onToggle, badge, badgeTone,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  badge?: string;
  badgeTone?: 'warn' | 'blue';
}) {
  return (
    <li>
      <label className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors',
        selected
          ? 'bg-pullim-blue-50 hover:bg-pullim-blue-100'
          : 'hover:bg-pullim-slate-50',
      )}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 accent-pullim-blue-600"
        />
        <span className={cn(
          'text-sm flex-1',
          selected ? 'text-pullim-blue-700 font-semibold' : 'text-pullim-slate-700',
        )}>
          {label}
        </span>
        {badge && (
          <span className={cn(
            'rounded-full px-1.5 py-0.5 font-mono text-[length:var(--text-2xs)] font-bold',
            badgeTone === 'warn'
              ? 'bg-pullim-warn-bg text-pullim-warn'
              : 'bg-pullim-blue-50 text-pullim-blue-700',
          )}>
            {badge}
          </span>
        )}
      </label>
    </li>
  );
}
