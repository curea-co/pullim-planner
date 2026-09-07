'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { track } from '@vercel/analytics';
import { currentPersona, getDday } from '@/lib/mock';
import { REFLECTION_ENABLED } from '@/lib/flags';
import { replaceQuery } from '@/lib/planner/query-nav';
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
      // 같은 pathname · 쿼리만 바뀌는 이동이다 — 홈이 F-01 로 겪은 것과 같은 자리다.
      // `/planner/reports` 도 서버에서 searchParams 를 읽지 않는 정적 페이지라,
      // `?view=month` 로 하드 로드하면 그 URL 이 쿼리 없는 캐시 키에 canonicalUrl 로 박히고
      // 이후 뷰 토글이 전부 그 URL 로 커밋돼 **무반응**이 된다(lib/planner/query-nav 주석).
      // 다른 파라미터는 보존한다 — 뷰를 바꿨다고 나머지 쿼리가 사라질 이유가 없다.
      const sp = new URLSearchParams(params);
      if (next === 'week') sp.delete('view');
      else sp.set('view', next);
      const qs = sp.toString();
      replaceQuery(`/planner/reports${qs ? `?${qs}` : ''}`);
    },
    [params, view],
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
      // 리포트는 `/planner` 와 **다른 경로**다 — 히트맵·회고가 주는 목적지로 가려면 진짜
      // 라우트 이동이어야 한다. History API 를 쓰면 화면은 리포트에 남고 주소만 갈린다.
      onNavigate={(url) => router.push(url)}
      onParentShareClick={onParentShareClick}
    />
  );
}
