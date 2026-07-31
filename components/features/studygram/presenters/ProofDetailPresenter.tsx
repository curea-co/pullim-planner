'use client';

import { ArrowLeft } from 'lucide-react';
import type { StudyProof } from '../types';
import { VISIBILITY_LABEL } from '../types';
import { ProofCard } from '../components/proof-card';

interface ProofDetailPresenterProps {
  proof: StudyProof;
  onBack: () => void;
  /** 내가 응원했는지(세션 내) — 버튼 활성 표시. */
  reacted?: boolean;
  /** 응원 토글 — 미제공이면 버튼을 노출하지 않는다(시그니처 하위호환). */
  onToggleReaction?: () => void;
}

export default function ProofDetailPresenter({
  proof,
  onBack,
  reacted = false,
  onToggleReaction,
}: ProofDetailPresenterProps) {
  const { snapshot } = proof;

  return (
    <div className="flex flex-col gap-4">
      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 flex items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
      >
        <ArrowLeft className="h-4 w-4" />
        공유
      </button>

      {/* 인증 카드 풀사이즈 */}
      <div className="mx-auto w-full max-w-sm">
        <ProofCard proof={proof} variant="detail" />
      </div>

      {/* 메타 정보 */}
      <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">공개 범위</span>
          <span className="font-medium text-foreground">
            {VISIBILITY_LABEL[proof.visibility]}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">받은 반응</span>
          <span className="flex items-center gap-2">
            <span className="font-medium text-foreground">{proof.reactionCount}개</span>
            {onToggleReaction && (
              <button
                type="button"
                onClick={onToggleReaction}
                aria-pressed={reacted}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 ${
                  reacted
                    ? 'border-pullim-blue-300 bg-pullim-blue-50 text-pullim-blue-700'
                    : 'border-border text-muted-foreground hover:bg-pullim-slate-50'
                }`}
              >
                {reacted ? '🔥 응원함' : '🔥 응원하기'}
              </button>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">컨디션</span>
          <span className="font-medium text-foreground">{snapshot.condition}/5</span>
        </div>
        {snapshot.accuracy !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">정답률</span>
            <span className="font-medium text-foreground">{snapshot.accuracy}%</span>
          </div>
        )}
      </div>

      {/* 한줄 회고 */}
      <div className="rounded-2xl border border-border bg-background p-4">
        <p className="mb-1.5 text-xs text-muted-foreground">한줄 회고</p>
        <p className="text-sm text-foreground">{snapshot.reflectionLine}</p>
      </div>
    </div>
  );
}
