import { redirect } from 'next/navigation';

/**
 * 기존 `/planner/calendar`는 Plan 4에서 홈(`/planner`)으로 흡수됨.
 * 외부 링크·북마크 호환을 위해 redirect 유지.
 *
 * `?view=` 등 쿼리는 **그대로 넘긴다.** 예전에는 버렸는데, 그 탓에
 * `today-reflection` 의 "월간으로 보기"(`?view=month`)가 항상 일간으로 떨어졌다
 * (QA 2026-09-04 F-01 조사 중 발견). 앱 내부 호출부는 `/planner` 를 직접 가리키도록
 * 바꿨고, 이 전달은 남아 있는 외부 북마크를 위한 것이다.
 */
export default async function PlannerCalendarRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (typeof v === 'string') sp.set(k, v);
    else if (Array.isArray(v)) v.forEach(one => sp.append(k, one));
  }
  const qs = sp.toString();
  redirect(`/planner${qs ? `?${qs}` : ''}`);
}
