'use client';

import Link from 'next/link';
import { Wrench, Sparkles, ArrowRight } from 'lucide-react';

/** 시간표 0개 — 신규 가입자용 빈 상태 */
export function EmptyState() {
  return (
    <section className="bg-card rounded-2xl border border-dashed p-8 text-center">
      <span className="bg-pullim-blue-50 text-pullim-blue-600 mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full">
        <Wrench className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="text-pullim-slate-900 mt-3 text-base font-bold tracking-tight">
        첫 시간표를 만들어보세요
      </h2>
      <p className="text-pullim-slate-500 mx-auto mt-1 max-w-sm text-xs leading-relaxed">
        시험 일정만 입력하면 AI가 시간 단위로 학습 계획을 짜줘요. 9단계 프로세스로 5분 안에 완성.
      </p>
      <Link
        href="/planner/manage/new"
        className="bg-pullim-blue-600 hover:bg-pullim-blue-700 mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-pullim-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
      >
        <Sparkles className="h-3.5 w-3.5" />
        새 시간표 만들기
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
