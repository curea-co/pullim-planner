'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import SetupPresenter, { SETUP_STEPS, type SetupStep } from '../presenters/SetupPresenter';
import { mockStudygramSetting, saveStudygramSetting, type StudygramSetting } from '@/lib/mock/studygram';
import {
  pullimPlannerClient,
  pullimToStudygramSetting,
  toStudygramSettingWrite,
} from '@/lib/planner/pullim-client';
import type { TonePresetId } from '../types';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

// 미온보딩(설정 미생성) 진입 시 폼 기본값 — mock 값을 seed 로 재사용해 빈 폼을 피한다.
const DEFAULT_SETTING: StudygramSetting = {
  nickname: mockStudygramSetting.nickname,
  topicLine: mockStudygramSetting.topicLine,
  tonePresetId: mockStudygramSetting.tonePresetId,
  goalHorizonDays: mockStudygramSetting.goalHorizonDays,
  goalPostsPerDay: mockStudygramSetting.goalPostsPerDay,
  consentGiven: mockStudygramSetting.consentGiven,
};

export default function SetupContainer() {
  const router = useRouter();

  const [step, setStep] = useState<SetupStep>('topic');
  const [nickname, setNickname] = useState(DEFAULT_SETTING.nickname);
  const [topicLine, setTopicLine] = useState(DEFAULT_SETTING.topicLine);
  const [tonePresetId, setTonePresetId] = useState<TonePresetId>(DEFAULT_SETTING.tonePresetId);
  const [goalHorizonDays, setGoalHorizonDays] = useState(DEFAULT_SETTING.goalHorizonDays);
  const [goalPostsPerDay, setGoalPostsPerDay] = useState(DEFAULT_SETTING.goalPostsPerDay);
  // 공유 동의(opt-in, BE BR-4) — 최초 사용자는 false 로 시작해 명시 동의를 강제한다(mock seed 로 덮지 않음).
  const [consentGiven, setConsentGiven] = useState(false);
  // 저장 in-flight — 더블 제출(연속 탭) 방어.
  const [saving, setSaving] = useState(false);
  // 로드 중 — real 모드 초기 prefill 대기(bypass 는 즉시 false).
  const [loading, setLoading] = useState(!DEV_AUTH_BYPASS);
  // 로드 실패(네트워크 등) — null(미온보딩, 기본값 정상)과 구분. 실패면 저장을 막고 재시도 안내(R3b 미러).
  const [loadError, setLoadError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // 마운트 시 기존 설정 prefill — bypass=mock, real=getSetting(null=미온보딩→기본값 유지).
  // effect 본문 동기 setState 는 cascading-render 린트 위반이라 async IIFE 안에서만 세팅한다(R3b 교훈).
  useEffect(() => {
    if (DEV_AUTH_BYPASS) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const setting = await pullimPlannerClient.getSetting();
        if (!cancelled) {
          if (setting) {
            // 기존 온보딩 — 저장된 값 prefill(동의 포함).
            const view = pullimToStudygramSetting(setting);
            setNickname(view.nickname);
            setTopicLine(view.topicLine);
            setTonePresetId(view.tonePresetId);
            setGoalHorizonDays(view.goalHorizonDays);
            setGoalPostsPerDay(view.goalPostsPerDay);
            setConsentGiven(view.consentGiven);
          }
          // setting === null 은 미온보딩(정상) — 기본값 유지, consent 는 false 로 명시 동의 유도.
        }
      } catch (e) {
        // 로드 실패는 null(미온보딩)과 다르다 — 저장을 막아 mock 기본값이 실제 설정을 덮어쓰지 않게 한다.
        if (!cancelled) {
          setLoadError(true);
          toast.error(e instanceof ApiError ? e.message : '설정을 불러오지 못했어요');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const currentIdx = SETUP_STEPS.indexOf(step);

  const handleNext = useCallback(() => {
    if (currentIdx < SETUP_STEPS.length - 1) {
      setStep(SETUP_STEPS[currentIdx + 1]);
    }
  }, [currentIdx]);

  const handleBack = useCallback(() => {
    if (currentIdx > 0) {
      setStep(SETUP_STEPS[currentIdx - 1]);
    }
  }, [currentIdx]);

  const handleSubmit = useCallback(() => {
    if (saving || loadError) return;

    // dev 우회 — 공유 mock 세팅에 반영 후 허브로 이동(허브가 같은 객체를 읽어 변경 반영).
    if (DEV_AUTH_BYPASS) {
      saveStudygramSetting({ nickname, topicLine, tonePresetId, goalHorizonDays, goalPostsPerDay, consentGiven });
      router.push('/planner/share');
      return;
    }

    setSaving(true);
    void (async () => {
      try {
        // 첫 생성/수정 모두 PATCH — nickname(1~20자)·consentGiven(BR-4) 은 폼 필수라 실제 값이 실린다.
        await pullimPlannerClient.updateSetting(
          toStudygramSettingWrite({ nickname, topicLine, tonePresetId, goalHorizonDays, goalPostsPerDay, consentGiven }),
        );
        router.push('/planner/share');
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '설정을 저장하지 못했어요');
        setSaving(false);
      }
    })();
  }, [saving, loadError, router, nickname, topicLine, tonePresetId, goalHorizonDays, goalPostsPerDay, consentGiven]);

  // 초기 로드 중 — prefill 전 빈/mock 값을 잠깐 보여주지 않게.
  if (loading) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        설정을 불러오는 중…
      </div>
    );
  }

  // 로드 실패(일시 장애) — 미온보딩(null)과 구분해 저장을 막고 재시도 제공(mock 이 실제 설정을 덮어쓰지 않게).
  if (loadError) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        설정을 불러오지 못했어요.{' '}
        <button
          type="button"
          onClick={() => setReloadTick((t) => t + 1)}
          className="text-pullim-blue-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <SetupPresenter
      step={step}
      nickname={nickname}
      topicLine={topicLine}
      tonePresetId={tonePresetId}
      goalHorizonDays={goalHorizonDays}
      goalPostsPerDay={goalPostsPerDay}
      consentGiven={consentGiven}
      onNicknameChange={setNickname}
      onTopicChange={setTopicLine}
      onToneChange={setTonePresetId}
      onHorizonChange={setGoalHorizonDays}
      onPostsChange={setGoalPostsPerDay}
      onConsentChange={setConsentGiven}
      onNext={handleNext}
      onBack={handleBack}
      onSubmit={handleSubmit}
      submitDisabled={saving}
    />
  );
}
