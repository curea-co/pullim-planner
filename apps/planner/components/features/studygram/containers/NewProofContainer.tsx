'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shell/page-header';
import { ProofCard } from '../components/proof-card';
import { TONE_PRESETS, VISIBILITY_LABEL, CONDITION_EMOJI } from '../types';
import type { StudyProof, Visibility } from '../types';
import { mockStudygramSetting } from '@/lib/mock/studygram';
import { cn } from '@/lib/utils';

/** 오늘의 학습 결과 (홈/리포트 mock 데이터에서 파생 — 실제 연동 시 reports 데이터 재사용) */
const TODAY_SNAPSHOT = {
  completedBlocks: 5,
  totalBlocks: 6,
  studyMinutes: 127,
  accuracy: 82,
  condition: 4 as const,
  reflectionLine: '영어 독해 오답 원인 파악. 내일 어법 집중.',
  subjectTags: ['영어', '국어'],
};

export default function NewProofContainer() {
  const router = useRouter();
  const setting = mockStudygramSetting;

  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('close_friends');

  const previewProof: StudyProof = {
    id: 'preview',
    userId: 'dev-local',
    date: '2026-06-22',
    snapshot: TODAY_SNAPSHOT,
    tonePresetId: setting.tonePresetId,
    caption,
    visibility,
    createdAt: new Date().toISOString(),
    reactionCount: 0,
  };

  const handlePost = useCallback(() => {
    // TODO: POST /planner/studygram/proofs (api-client 연동 후)
    router.push('/planner/share');
  }, [router]);

  const selectedTone = TONE_PRESETS.find((t) => t.id === setting.tonePresetId);

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
            <p className="text-[11px] text-muted-foreground">
              세팅에서 변경할 수 있어요
            </p>
          </div>
        </div>

        {/* 캡션 */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground">한 줄 캡션 (선택)</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={140}
            placeholder="오늘 한 줄 남기기"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
          />
          <div className="text-right text-[11px] text-muted-foreground">{caption.length}/140</div>
        </div>

        {/* 공개 범위 */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">공개 범위</p>
          <div className="grid grid-cols-3 gap-2">
            {(['close_friends', 'friends', 'private'] as Visibility[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
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
          <p className="text-[11px] text-muted-foreground">
            {visibility === 'close_friends' && '내가 지정한 친한 친구에게만 보여요.'}
            {visibility === 'friends' && '수락한 친구 전체에게 보여요.'}
            {visibility === 'private' && '나만 볼 수 있어요.'}
          </p>
        </div>

        {/* 공유 동의 안내 */}
        <div className="rounded-xl bg-pullim-slate-50 px-4 py-3 text-xs text-muted-foreground">
          내가 고른 친구에게만 보여요. 언제든 비공개로 바꿀 수 있어요.
        </div>

        {/* 게시 버튼 */}
        <button
          type="button"
          onClick={handlePost}
          className="w-full rounded-xl bg-pullim-blue-600 py-3.5 text-sm font-bold text-white shadow-pullim-sm hover:bg-pullim-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          인증하기
        </button>
      </div>
    </>
  );
}
