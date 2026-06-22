'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SetupPresenter, { type SetupStep } from '../presenters/SetupPresenter';
import { mockStudygramSetting } from '@/lib/mock/studygram';
import type { TonePresetId } from '../types';

const STEPS: SetupStep[] = ['topic', 'tone', 'goal'];

export default function SetupContainer() {
  const router = useRouter();

  // 기존 세팅 prefill
  const [step, setStep] = useState<SetupStep>('topic');
  const [topicLine, setTopicLine] = useState(mockStudygramSetting.topicLine);
  const [tonePresetId, setTonePresetId] = useState<TonePresetId>(mockStudygramSetting.tonePresetId);
  const [goalHorizonDays, setGoalHorizonDays] = useState(mockStudygramSetting.goalHorizonDays);
  const [goalPostsPerDay, setGoalPostsPerDay] = useState(mockStudygramSetting.goalPostsPerDay);

  const currentIdx = STEPS.indexOf(step);

  const handleNext = useCallback(() => {
    if (currentIdx < STEPS.length - 1) {
      setStep(STEPS[currentIdx + 1]);
    }
  }, [currentIdx]);

  const handleBack = useCallback(() => {
    if (currentIdx > 0) {
      setStep(STEPS[currentIdx - 1]);
    }
  }, [currentIdx]);

  const handleSubmit = useCallback(() => {
    // TODO: PATCH /planner/studygram/setting (api-client 연동 후)
    // 현재는 mock — 저장 완료 후 공유 허브로 이동
    router.push('/planner/share');
  }, [router]);

  return (
    <SetupPresenter
      step={step}
      topicLine={topicLine}
      tonePresetId={tonePresetId}
      goalHorizonDays={goalHorizonDays}
      goalPostsPerDay={goalPostsPerDay}
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
