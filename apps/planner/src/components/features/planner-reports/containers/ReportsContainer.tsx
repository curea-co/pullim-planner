'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { track } from '@vercel/analytics';
import { currentPersona, getDday } from '@/lib/mock';
import type { ReportsView } from '../components/reports-shell';
import ReportsPresenter from '../presenters/ReportsPresenter';

const VALID_VIEWS: ReportsView[] = ['day', 'week', 'month'];

const descriptionByView: Record<
  ReportsView,
  (dday: number, examLabel: string) => React.ReactNode
> = {
  day:   (dday, examLabel) => <>오늘 학습 결과를 한 화면에서 — {examLabel} · D-{dday}</>,
  week:  (_, examLabel) => <>이번 주 학습 시간·정답률·약점 진도 종합 — {examLabel}</>,
  month: (dday, examLabel) => <>{examLabel}까지 D-{dday} · 큰 그림과 마일스톤 점검</>,
};

export default function ReportsContainer() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('view');
  const view: ReportsView = (VALID_VIEWS as string[]).includes(raw ?? '')
    ? (raw as ReportsView)
    : 'week';

  const [consentOpen, setConsentOpen] = useState(false);

  const onChangeView = useCallback(
    (next: ReportsView) => {
      track('reports_view_change', { from: view, to: next });
      const qs = next === 'week' ? '' : `?view=${next}`;
      router.replace(`/planner/reports${qs}`, { scroll: false });
    },
    [router, view],
  );

  // day view 진입 시 1회 impression — TodayReflection이 default expanded 노출됐는지 시그널
  useEffect(() => {
    if (view === 'day') {
      track('reports_day_reflection_view', { defaultOpen: true });
    }
  }, [view]);

  const onParentShareClick = useCallback(() => {
    track('reports_parent_card_open', { trigger: 'send_button', view });
    setConsentOpen(true);
  }, [view]);

  const dday = getDday(currentPersona);

  return (
    <ReportsPresenter
      view={view}
      description={descriptionByView[view](dday, currentPersona.examLabel)}
      consentOpen={consentOpen}
      onChangeView={onChangeView}
      onConsentOpenChange={setConsentOpen}
      onParentShareClick={onParentShareClick}
    />
  );
}
