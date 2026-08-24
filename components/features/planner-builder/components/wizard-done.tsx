'use client';

import { Check } from 'lucide-react';

/**
 * 위저드 완료 화면.
 *
 * 활성화 직후 관리 목록으로 곧장 튕기면 학생이 **방금 무엇을 만들었는지 확인할 자리**가
 * 없다(토스트는 3초 뒤 사라진다). 답한 것이 어떤 시간표가 됐는지 한 번 보여주고 보낸다.
 *
 * 여기서 약속하지 않는 것 — 완료 기록으로 시간표를 자동 조정하는 기능은 아직 없다.
 * 문구가 그걸 암시하지 않도록 한다.
 */
export type WizardDoneSummary = {
  plannerName: string;
  /** "D-87" · "D-DAY" · null(시험일 미정) */
  ddayLabel: string | null;
  examLabel: string;
  subjectCount: number;
  unitCount: number;
  /** 미리보기 7일에 잡힌 블록 수 — 배치 결과를 숫자로 확인시킨다 */
  previewBlocks: number;
  previewDays: number;
  patternLabel: string;
  patternSpec: string;
  /** 루틴 게이트가 켜졌을 때만 — 꺼져 있으면 null */
  routineCount: number | null;
};

type Props = {
  summary: WizardDoneSummary;
  onHome: () => void;
  onManage: () => void;
};

export function WizardDone({ summary, onHome, onManage }: Props) {
  const rows: [string, string][] = [
    ['목표', summary.ddayLabel ? `${summary.examLabel} · ${summary.ddayLabel}` : summary.examLabel],
    ['학습 범위', `${summary.subjectCount}과목 · ${summary.unitCount}단원`],
    ['블록', `${summary.previewDays}일 ${summary.previewBlocks}개 · ${summary.patternLabel}(${summary.patternSpec})`],
  ];
  if (summary.routineCount !== null) {
    rows.push(['내 루틴', summary.routineCount > 0 ? `${summary.routineCount}개 적용` : '적용 안 함']);
  }

  return (
    <section className="py-10 text-center">
      <div className="bg-pullim-success-bg text-pullim-success mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full">
        <Check className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="text-pullim-slate-900 mt-4 text-xl font-extrabold tracking-tight">
        시간표가 활성화됐어요
      </h2>
      <p className="text-pullim-slate-500 mx-auto mt-1.5 max-w-[42ch] text-xs leading-relaxed">
        <strong className="text-pullim-slate-700">{summary.plannerName}</strong> 기준으로 짰어요.
        블록을 완료하면 기록이 남지만 <strong className="text-pullim-slate-700">자동으로 시간표를 고쳐주진 않아요</strong> —
        바꾸고 싶으면 언제든 시간표를 수정하세요.
      </p>

      <dl className="border-pullim-slate-200 mx-auto mt-6 max-w-md overflow-hidden rounded-xl border text-left">
        {rows.map(([k, v], i) => (
          <div
            key={k}
            className={`flex items-baseline justify-between gap-4 px-3.5 py-2.5 text-xs ${
              i > 0 ? 'border-pullim-slate-100 border-t' : ''
            }`}
          >
            <dt className="text-pullim-slate-500 shrink-0">{k}</dt>
            <dd className="text-pullim-slate-900 text-right font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onHome}
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 focus-visible:ring-pullim-blue-500 rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
        >
          오늘 시간표 보기
        </button>
        <button
          type="button"
          onClick={onManage}
          className="bg-pullim-slate-100 text-pullim-slate-700 hover:bg-pullim-slate-200 focus-visible:ring-pullim-blue-500 rounded-lg px-5 py-2.5 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
        >
          시간표 관리
        </button>
      </div>
    </section>
  );
}
