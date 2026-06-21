'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { currentPersona, getDday } from '@/lib/mock';
import { useAuth } from '@/lib/auth/auth-context';
import OnboardingPresenter from '../presenters/OnboardingPresenter';

export default function OnboardingContainer() {
  const { status, completeOnboarding, logout } = useAuth();
  const [failed, setFailed] = useState(false);
  const dday = getDday(currentPersona);
  const ddayLabel =
    dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${Math.abs(dday)}`;

  // 'onboarding'(학습 프로필 미생성) 진입 시 프로필을 생성해 limbo(/planner/me 404)를 해소한다.
  // 현재 온보딩은 소개 위주라 입력 없이 생성(서버 기본값) — 학년/계열 수집 폼은 후속(부분 upsert).
  // 효과 안에선 동기 setState 를 피하고(catch 의 setFailed 만 비동기), 실패 시 영구 정체 대신
  // 에러 + 재시도 UI 를 보인다(자동 무한재시도 안 함). 성공 시 authenticated → 정상 진입.
  useEffect(() => {
    if (status === 'onboarding') {
      void completeOnboarding().catch(() => setFailed(true));
    }
  }, [status, completeOnboarding]);

  // 재시도 — 클릭 핸들러라 동기 setState 가 안전하다.
  const retry = useCallback(() => {
    setFailed(false);
    void completeOnboarding().catch(() => setFailed(true));
  }, [completeOnboarding]);

  if (failed) {
    return (
      <div className="bg-pullim-slate-50 flex h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-pullim-slate-700 text-sm">
          프로필을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={retry}>
            다시 시도
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            로그아웃
          </Button>
        </div>
      </div>
    );
  }

  return <OnboardingPresenter ddayLabel={ddayLabel} />;
}
