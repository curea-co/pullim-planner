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

// 공유 설정(온보딩) 라우트 — SetupContainer 가 걸린 경로(app/(student)/planner/share/setup).
const SETUP_ROUTE = '/planner/share/setup';

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
  // 카드 톤 — bypass=mock 즉시, real=getSetting 로드.
  const [tonePresetId, setTonePresetId] = useState<TonePresetId>(
    mockStudygramSetting.tonePresetId,
  );
  // 톤(설정) 로드 상태 — real 모드는 실제 설정이 로드돼야 게시를 허용한다(로드 실패·미온보딩 시 mock
  // 톤으로 조용히 오염 게시 금지). bypass 는 즉시 준비 완료.
  const [toneReady, setToneReady] = useState(DEV_AUTH_BYPASS);
  const [toneLoadError, setToneLoadError] = useState(false);
  // 미온보딩(getSetting null) — 공유 설정을 먼저 완료해야 게시할 수 있다(409 사전 차단). 게시 화면 대신
  // 안내를 띄운다(직접 URL 진입 사용자가 활성 버튼·mock 톤 미리보기를 보고 클릭해야 409 받는 회귀 방지).
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  // 설정은 있으나 공유 동의(consentGiven) 해제 상태 — BR-4 로 게시 불가. 설정에서 동의를 켜도록 안내한다.
  const [needsConsent, setNeedsConsent] = useState(false);
  // 게시 in-flight — 더블 게시(더블클릭·직접 URL 재진입) 방어.
  const [posting, setPosting] = useState(false);

  // 실 API: 설정을 읽어 톤을 미리보기에 반영한다(bypass 는 mock 톤 사용). getSetting 분기:
  // 설정+동의→게시 허용, 설정+미동의→needsConsent(게시 차단), null→미온보딩(게시 차단), throw→로드 실패.
  // effect 본문 동기 setState 금지(cascading-render 린트) → async IIFE 안에서만 세팅(R3b 교훈).
  useEffect(() => {
    if (DEV_AUTH_BYPASS) return;
    let cancelled = false;
    void (async () => {
      setToneReady(false);
      setToneLoadError(false);
      setNeedsOnboarding(false);
      setNeedsConsent(false);
      try {
        const setting = await pullimPlannerClient.getSetting();
        if (!cancelled) {
          if (setting) {
            const view = pullimToStudygramSetting(setting);
            setTonePresetId(view.tonePresetId);
            if (view.consentGiven) {
              // 설정 존재 + 동의 — 정상 게시 허용.
              setToneReady(true);
            } else {
              // 설정 존재 + 미동의 — BR-4 게시 차단. 설정에서 동의를 켜도록 안내(409 사전 차단).
              setNeedsConsent(true);
            }
          } else {
            // null = 미온보딩 — 게시 차단(mock 톤으로 게시하지 않음). 설정 완료를 안내한다.
            setNeedsOnboarding(true);
          }
        }
      } catch {
        // 로드 실패 — mock 톤으로 오염 게시하지 않도록 게시를 막는다(안내 후 재시도 유도).
        if (!cancelled) setToneLoadError(true);
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

    // 미온보딩·미동의·톤(설정) 로드 실패 시 게시 차단 — mock 톤으로 오염 게시하지 않는다.
    if (!DEV_AUTH_BYPASS && !toneReady) {
      if (needsOnboarding) {
        toast.error('공유 설정을 먼저 완료하세요');
        router.push(SETUP_ROUTE);
        return;
      }
      if (needsConsent) {
        toast.error('공유 동의를 켜야 인증할 수 있어요');
        router.push(SETUP_ROUTE);
        return;
      }
      toast.error('설정을 불러오지 못했어요', {
        description: '잠시 후 다시 시도해 주세요',
      });
      return;
    }

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
  }, [posting, toneReady, needsOnboarding, needsConsent, router, previewProof, tonePresetId, caption, visibility]);

  const handleCaptionChange = useCallback((c: string) => setCaption(c), []);
  const handleVisibilityChange = useCallback((v: Visibility) => setVisibility(v), []);

  // 미온보딩 — 게시 화면 대신 설정 완료 안내(직접 URL 진입 사용자가 mock 톤 미리보기·활성 버튼을 보고
  // 클릭해야 409 를 받는 회귀 차단). DEV_AUTH_BYPASS 는 이 분기에 안 걸린다(needsOnboarding=false).
  if (needsOnboarding) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        공유 설정을 먼저 완료하세요.{' '}
        <button
          type="button"
          onClick={() => router.push(SETUP_ROUTE)}
          className="text-pullim-blue-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          설정하러 가기
        </button>
      </div>
    );
  }

  // 미동의(설정 존재 + consentGiven=false) — 게시 화면 대신 동의 켜기 안내(BR-4). 설정에서 켜도록 유도.
  if (needsConsent) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        공유 동의를 켜야 인증할 수 있어요.{' '}
        <button
          type="button"
          onClick={() => router.push(SETUP_ROUTE)}
          className="text-pullim-blue-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          설정에서 켜기
        </button>
      </div>
    );
  }

  // 게시 차단 = 톤(설정) 로드 실패 또는 아직 로드 중(real). bypass 는 항상 준비 완료.
  const postDisabled = !DEV_AUTH_BYPASS && !toneReady;

  return (
    <NewProofPresenter
      previewProof={previewProof}
      caption={caption}
      visibility={visibility}
      selectedTone={selectedTone}
      onCaptionChange={handleCaptionChange}
      onVisibilityChange={handleVisibilityChange}
      onPost={handlePost}
      postDisabled={postDisabled}
      postDisabledNote={
        toneLoadError ? '설정을 불러오지 못해 지금은 게시할 수 없어요.' : undefined
      }
    />
  );
}
