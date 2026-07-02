'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@pullim-planner/api-client';
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
  // 저장 in-flight — 더블 제출(연속 탭) 방어.
  const [saving, setSaving] = useState(false);

  // 마운트 시 기존 설정 prefill — bypass=mock, real=getSetting(null=미온보딩→기본값 유지).
  // effect 본문 동기 setState 는 cascading-render 린트 위반이라 async IIFE 안에서만 세팅한다(R3b 교훈).
  useEffect(() => {
    if (DEV_AUTH_BYPASS) return;
    let cancelled = false;
    void (async () => {
      try {
        const setting = await pullimPlannerClient.getSetting();
        if (!cancelled && setting) {
          const view = pullimToStudygramSetting(setting);
          setNickname(view.nickname);
          setTopicLine(view.topicLine);
          setTonePresetId(view.tonePresetId);
          setGoalHorizonDays(view.goalHorizonDays);
          setGoalPostsPerDay(view.goalPostsPerDay);
        }
      } catch (e) {
        // 로드 실패는 기본값 유지 + 안내(폼은 그대로 채워 작성은 가능하게).
        if (!cancelled) {
          toast.error(
            e instanceof ApiError ? e.message : '설정을 불러오지 못했어요',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (saving) return;

    // dev 우회 — 공유 mock 세팅에 반영 후 허브로 이동(허브가 같은 객체를 읽어 변경 반영).
    if (DEV_AUTH_BYPASS) {
      saveStudygramSetting({ nickname, topicLine, tonePresetId, goalHorizonDays, goalPostsPerDay });
      router.push('/planner/share');
      return;
    }

    setSaving(true);
    void (async () => {
      try {
        // 첫 생성/수정 모두 PATCH — nickname(피어 식별, 1~20자)은 폼 필수라 실제 값이 실린다.
        await pullimPlannerClient.updateSetting(
          toStudygramSettingWrite({ nickname, topicLine, tonePresetId, goalHorizonDays, goalPostsPerDay }),
        );
        router.push('/planner/share');
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '설정을 저장하지 못했어요');
        setSaving(false);
      }
    })();
  }, [saving, router, nickname, topicLine, tonePresetId, goalHorizonDays, goalPostsPerDay]);

  return (
    <SetupPresenter
      step={step}
      nickname={nickname}
      topicLine={topicLine}
      tonePresetId={tonePresetId}
      goalHorizonDays={goalHorizonDays}
      goalPostsPerDay={goalPostsPerDay}
      onNicknameChange={setNickname}
      onTopicChange={setTopicLine}
      onToneChange={setTonePresetId}
      onHorizonChange={setGoalHorizonDays}
      onPostsChange={setGoalPostsPerDay}
      onNext={handleNext}
      onBack={handleBack}
      onSubmit={handleSubmit}
    />
  );
}
