'use client';

import { palettes } from '@/lib/tokens/palettes';
import { TONE_TO_PALETTE, CONDITION_EMOJI, VISIBILITY_LABEL } from '../types';
import type { StudyProof } from '../types';
import { cn } from '@/lib/utils';

interface ProofCardProps {
  proof: StudyProof;
  ownerName?: string;
  /** 그리드(썸네일) vs 상세(풀사이즈) */
  variant?: 'grid' | 'detail';
  onClick?: () => void;
}

export function ProofCard({ proof, ownerName, variant = 'grid', onClick }: ProofCardProps) {
  const paletteId = TONE_TO_PALETTE[proof.tonePresetId];
  const palette = palettes[paletteId];
  const { snapshot } = proof;

  const headerBg = palette.block.concept;  // 팔레트 대표색으로 헤더 배경
  const accentColor = palette.block.mock;

  const isGrid = variant === 'grid';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-border bg-background text-left shadow-pullim-sm transition-shadow hover:shadow-pullim-md',
        isGrid ? 'aspect-square w-full' : 'w-full max-w-sm',
        onClick && 'cursor-pointer',
      )}
    >
      {/* 상단 헤더 — 날짜 + D-day (팔레트 배경) */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: headerBg }}
      >
        <span className="text-xs font-bold text-white">
          {formatDate(proof.date)}
        </span>
        {proof.visibility !== 'private' && (
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs text-white">
            {VISIBILITY_LABEL[proof.visibility]}
          </span>
        )}
      </div>

      {/* 본문 */}
      <div className="flex flex-1 flex-col gap-1.5 px-3 py-2">
        {/* 과목 태그 */}
        <div className="flex flex-wrap gap-1">
          {snapshot.subjectTags.map((tag) => (
            <span
              key={tag}
              className="rounded-md px-1.5 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: accentColor }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 블록 완료 + 시간 */}
        <div className="flex items-center gap-2 text-xs text-foreground">
          <span className="font-semibold">
            {snapshot.completedBlocks}/{snapshot.totalBlocks} 블록
          </span>
          <span className="text-muted-foreground">·</span>
          <span>{Math.floor(snapshot.studyMinutes / 60)}h {snapshot.studyMinutes % 60}m</span>
          {snapshot.accuracy !== undefined && (
            <>
              <span className="text-muted-foreground">·</span>
              <span>정답률 {snapshot.accuracy}%</span>
            </>
          )}
        </div>

        {/* 컨디션 + 한줄회고 */}
        {!isGrid && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {CONDITION_EMOJI[snapshot.condition]} {snapshot.reflectionLine}
          </p>
        )}
        {isGrid && (
          <span className="text-base leading-none">{CONDITION_EMOJI[snapshot.condition]}</span>
        )}

        {/* 캡션 */}
        {proof.caption && (
          <p className="mt-auto text-xs font-medium text-foreground line-clamp-1">
            {proof.caption}
          </p>
        )}

        {/* 소유자 + 반응 */}
        <div className="flex items-center justify-between">
          {ownerName && (
            <span className="text-xs text-muted-foreground">{ownerName}</span>
          )}
          {proof.reactionCount > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              🔥 {proof.reactionCount}
            </span>
          )}
        </div>
      </div>

      {/* 하단 워터마크 */}
      <div
        className="px-3 py-1.5 text-right text-xs font-semibold text-white/70"
        style={{ backgroundColor: headerBg }}
      >
        pullim
      </div>
    </button>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} (${['일','월','화','수','목','금','토'][d.getDay()]})`;
}
