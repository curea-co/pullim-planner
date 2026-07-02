'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@pullim-planner/api-client';
import { TONE_PRESETS } from '../types';
import type { StudyProof, TonePresetId, Visibility } from '../types';
import {
  mockStudygramSetting,
  mockStudyProofs,
  addStudyProof,
  hasTodayProof,
  todayKST,
} from '@/lib/mock/studygram';
import {
  pullimPlannerClient,
  pullimToStudyProof,
  pullimToStudygramSetting,
  toProofCreateInput,
} from '@/lib/planner/pullim-client';
import NewProofPresenter from '../presenters/NewProofPresenter';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

const TODAY = todayKST();

// 미리보기용 FE 추정 스냅샷 — 실제 객관 지표(snapshot)는 게시 시 BE 가 그날 학습에서 조립한다.
// 게시 전 미리보기는 BE 조립 결과를 알 수 없어 이 추정치를 유지한다.
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

  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('close_friends');
  // 카드 톤 — bypass=mock 즉시, real=getSetting 로드(미온보딩이면 mock 톤 유지).
  const [tonePresetId, setTonePresetId] = useState<TonePresetId>(
    mockStudygramSetting.tonePresetId,
  );
  // 게시 in-flight — 더블 게시(더블클릭·직접 URL 재진입) 방어.
  const [posting, setPosting] = useState(false);

  // 실 API: 톤 프리셋을 설정에서 읽어 미리보기 카드에 반영한다(bypass 는 mock 톤 사용).
  // effect 본문 동기 setState 금지(cascading-render 린트) → async IIFE 안에서만 세팅(R3b 교훈).
  useEffect(() => {
    if (DEV_AUTH_BYPASS) return;
    let cancelled = false;
    void (async () => {
      try {
        const setting = await pullimPlannerClient.getSetting();
        if (!cancelled && setting) {
          setTonePresetId(pullimToStudygramSetting(setting).tonePresetId);
        }
      } catch {
        // 톤 로드 실패는 조용히 mock 톤 유지 — 게시 흐름을 막지 않는다.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const previewProof = useMemo<StudyProof>(
    () => ({
      id: 'preview',
      userId: 'dev-local',
      date: TODAY,
      snapshot: TODAY_SNAPSHOT,
      tonePresetId,
      caption,
      visibility,
      createdAt: TODAY + 'T00:00:00.000Z',
      reactionCount: 0,
    }),
    [caption, visibility, tonePresetId],
  );

  const selectedTone = useMemo(
    () => TONE_PRESETS.find((t) => t.id === tonePresetId),
    [tonePresetId],
  );

  const handlePost = useCallback(() => {
    if (posting) return;

    // dev 우회 — 공유 배열에 새 카드를 추가해 허브의 목록·CTA 숨김·목표 진행도에 반영한다.
    // BR-2: 하루 1포스트 — 이미 오늘 카드가 있으면 중복 삽입하지 않고 허브로만 이동.
    if (DEV_AUTH_BYPASS) {
      if (!hasTodayProof(mockStudyProofs, TODAY)) {
        addStudyProof({
          ...previewProof,
          id: `proof-${Date.now()}`,
          createdAt: new Date().toISOString(),
        });
      }
      router.push('/planner/share');
      return;
    }

    setPosting(true);
    void (async () => {
      try {
        // BR-2 사전 확인 — 오늘 카드가 이미 있으면 게시하지 않고 허브로 이동(BE 409 도 아래에서 방어).
        const mine = await pullimPlannerClient.getProofs('mine');
        if (hasTodayProof(mine.map(pullimToStudyProof), TODAY)) {
          toast('오늘은 이미 인증했어요');
          router.push('/planner/share');
          return;
        }
        // 객관 지표(snapshot)는 BE 가 조립하므로 FE 는 date·tone·caption·visibility·reflection 만 보낸다.
        await pullimPlannerClient.createProof(
          toProofCreateInput({
            date: TODAY,
            tonePresetId,
            caption,
            visibility,
            reflectionLine: previewProof.snapshot.reflectionLine,
          }),
        );
        router.push('/planner/share');
      } catch (e) {
        // 409 = 동의 미충족·중복 카드 — 사유를 구분하지 않는 안내(generic) 후 허브로.
        if (e instanceof ApiError && e.statusCode === 409) {
          toast.error('지금은 인증카드를 게시할 수 없어요', {
            description: '오늘 이미 인증했거나 공유 동의가 필요해요',
          });
          router.push('/planner/share');
          return;
        }
        toast.error(e instanceof ApiError ? e.message : '인증카드를 게시하지 못했어요');
        setPosting(false);
      }
    })();
  }, [posting, router, previewProof, tonePresetId, caption, visibility]);

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
