'use client';

import { PageHeader } from '@/components/shell/page-header';
import { ProofCard } from '../components/proof-card';
import { VISIBILITY_LABEL } from '../types';
import type { StudyProof, Visibility, TonePreset } from '../types';
import { cn } from '@/lib/utils';

interface NewProofPresenterProps {
  previewProof: StudyProof;
  caption: string;
  visibility: Visibility;
  selectedTone: TonePreset | undefined;
  onCaptionChange: (caption: string) => void;
  onVisibilityChange: (v: Visibility) => void;
  onPost: () => void;
}

export default function NewProofPresenter({
  previewProof,
  caption,
  visibility,
  selectedTone,
  onCaptionChange,
  onVisibilityChange,
  onPost,
}: NewProofPresenterProps) {
  return (
    <>
      <PageHeader
        title="오늘 공부 인증하기"
        description="그날 결과가 카드로 자동 구성돼요"
      />
      <div className="space-y-5">
        {/* 카드 미리보기 */}
        <section>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">카드 미리보기</p>
          <ProofCard proof={previewProof} variant="detail" />
        </section>

        {/* 톤 표시 (세팅에서 가져옴) */}
        <div className="flex items-center gap-2 rounded-xl bg-pullim-slate-50 px-4 py-3">
          <span className="text-lg">{selectedTone?.emoji}</span>
          <div>
            <p className="text-xs font-semibold text-foreground">{selectedTone?.label} 톤</p>
            <p className="text-xs text-muted-foreground">세팅에서 변경할 수 있어요</p>
          </div>
        </div>

        {/* 캡션 */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground">한 줄 캡션 (선택)</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            maxLength={140}
            placeholder="오늘 한 줄 남기기"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
          />
          <div className="text-right text-xs text-muted-foreground">{caption.length}/140</div>
        </div>

        {/* 공개 범위 */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">공개 범위</p>
          <div className="grid grid-cols-3 gap-2">
            {(['close_friends', 'friends', 'private'] as Visibility[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onVisibilityChange(v)}
                className={cn(
                  'rounded-xl border-2 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                  v === visibility
                    ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                    : 'border-border bg-background text-muted-foreground hover:border-pullim-slate-300',
                )}
              >
                {VISIBILITY_LABEL[v]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {visibility === 'close_friends' && '내가 지정한 친한 친구에게만 보여요.'}
            {visibility === 'friends' && '수락한 친구 전체에게 보여요.'}
            {visibility === 'private' && '나만 볼 수 있어요.'}
          </p>
        </div>

        {/* 공유 동의 안내 */}
        <div className="rounded-xl bg-pullim-slate-50 px-4 py-3 text-xs text-muted-foreground">
          내가 고른 친구에게만 보여요. 언제든 비공개로 바꿀 수 있어요.
        </div>

        <button
          type="button"
          onClick={onPost}
          className="w-full rounded-xl bg-pullim-blue-600 py-3.5 text-sm font-bold text-white shadow-pullim-sm hover:bg-pullim-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          인증하기
        </button>
      </div>
    </>
  );
}

