'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { track } from '@vercel/analytics';
import { currentPersona, getDday } from '@/lib/mock';
import { REFLECTION_ENABLED } from '@/lib/flags';
import type { ReportsView } from '../components/reports-shell';
import ReportsPresenter from '../presenters/ReportsPresenter';

const VALID_VIEWS: ReportsView[] = ['day', 'week', 'month'];

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

  // day view 진입 시 1회 impression — TodayReflection이 default expanded 노출됐는지 시그널.
  // REFLECTION_ENABLED off면 실제로는 placeholder만 뜨므로 이벤트를 같은 조건으로 묶는다
  // (Codex #146 — 안 열린 패널을 defaultOpen:true로 잘못 집계하던 문제).
  useEffect(() => {
    if (view === 'day' && REFLECTION_ENABLED) {
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
      dday={dday}
      examLabel={currentPersona.examLabel}
      consentOpen={consentOpen}
      onChangeView={onChangeView}
      onConsentOpenChange={setConsentOpen}
      onParentShareClick={onParentShareClick}
    />
  );
}
