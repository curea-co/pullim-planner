'use client';

import { useEffect } from 'react';
import { currentPersona, getDday } from '@/lib/mock';
import { useAuth } from '@/lib/auth/auth-context';
import OnboardingPresenter from '../presenters/OnboardingPresenter';

export default function OnboardingContainer() {
  const { status, completeOnboarding } = useAuth();
  const dday = getDday(currentPersona);
  const ddayLabel =
    dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${Math.abs(dday)}`;

  // 'onboarding'(학습 프로필 미생성)으로 진입하면 프로필을 생성해 limbo(/planner/me 404)를 해소한다.
  // 이후 소개 화면의 '풀림 플래너 시작하기'(→ /planner)가 authenticated 라 정상 진입된다(RequireAuth
  // 리다이렉트 루프 방지). 현재 온보딩은 소개 위주라 입력 없이 생성(서버 기본값) — 학년/계열 등 수집
  // 폼은 후속(부분 upsert 라 이후 보강 가능). upsert 는 멱등이라 재마운트/중복 호출 무해.
  useEffect(() => {
    if (status === 'onboarding') void completeOnboarding();
  }, [status, completeOnboarding]);

  return <OnboardingPresenter ddayLabel={ddayLabel} />;
}
