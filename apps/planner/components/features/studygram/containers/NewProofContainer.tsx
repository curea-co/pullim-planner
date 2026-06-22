'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TONE_PRESETS } from '../types';
import type { StudyProof, Visibility } from '../types';
import { mockStudygramSetting, mockStudyProofs, addStudyProof, hasTodayProof, todayKST } from '@/lib/mock/studygram';
import NewProofPresenter from '../presenters/NewProofPresenter';

const TODAY = todayKST();

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

  const previewProof = useMemo<StudyProof>(
    () => ({
      id: 'preview',
      userId: 'dev-local',
      date: TODAY,
      snapshot: TODAY_SNAPSHOT,
      tonePresetId: setting.tonePresetId,
      caption,
      visibility,
      createdAt: TODAY + 'T00:00:00.000Z',
      reactionCount: 0,
    }),
    [caption, visibility, setting.tonePresetId],
  );

  const selectedTone = useMemo(
    () => TONE_PRESETS.find((t) => t.id === setting.tonePresetId),
    [setting.tonePresetId],
  );

  const handlePost = useCallback(() => {
    // TODO: POST /planner/studygram/proofs (api-client 연동 후)
    // mock 단계 — 공유 배열에 새 카드를 추가해 허브의 목록·CTA 숨김·목표 진행도에 반영한다 (codex).
    // BR-2: 하루 1포스트 — 이미 오늘 카드가 있으면(더블클릭·직접 URL 재진입) 중복 삽입하지 않고 허브로만 이동.
    if (!hasTodayProof(mockStudyProofs, TODAY)) {
      addStudyProof({
        ...previewProof,
        id: `proof-${Date.now()}`,
        createdAt: new Date().toISOString(),
      });
    }
    router.push('/planner/share');
  }, [router, previewProof]);

  const handleCaptionChange = useCallback((c: string) => setCaption(c), []);
  const handleVisibilityChange = useCallback((v: Visibility) => setVisibility(v), []);

  return (
    <NewProofPresenter
      previewProof={previewProof}
      caption={caption}
      visibility={visibility}
      selectedTone={selectedTone}
      onCaptionChange={handleCaptionChange}
      onVisibilityChange={handleVisibilityChange}
      onPost={handlePost}
    />
  );
}
