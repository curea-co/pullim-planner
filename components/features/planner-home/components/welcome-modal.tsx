'use client';

import Link from 'next/link';
import { CalendarClock, BarChart2, Share2, Repeat2, BookOpen } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogBody, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { REPORTS_ENABLED, ROUTINE_ENABLED } from '@/lib/flags';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

const FEATURES = [
  { icon: CalendarClock, title: '일·주·월 시간표', desc: '일·주·월 단위로 학습 블록을 계획하고 관리해요.' },
  // 루틴은 출시 게이트(ROUTINE_ENABLED) 따라 노출 — prod 차단 시 잘못된 안내 방지
  ...(ROUTINE_ENABLED
    ? [{ icon: Repeat2, title: '루틴', desc: '반복 블록을 설정해 매일 자동 채워요.' }]
    : []),
  // 성장 리포트는 soft open 게이트(REPORTS_ENABLED) — 차단 중엔 "출시 예정"으로 예고만
  ...(REPORTS_ENABLED
    ? [{ icon: BarChart2, title: '성장 리포트', desc: '완료율·학습 시간·컨디션 트렌드를 매일 기록해요.' }]
    : [{ icon: BarChart2, title: '성장 리포트 (출시 예정)', desc: '일·주·월 회고를 준비하고 있어요 — 곧 열려요.' }]),
  { icon: Share2,       title: '공부 공유',      desc: '오늘 결과를 인증 카드로 만들고 친구와 나눠요.' },
];

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">풀림 플래너 시작하기</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            시험 목표부터 매일 학습까지, 한곳에서 계획하고 기록해요.
          </DialogDescription>
        </DialogHeader>

        {/* DialogBody(px-4)로 감싸 아이콘 열의 좌측선을 헤더 텍스트("시험 목표부터…", DialogHeader px-4)와
            정렬 — ul이 DialogContent 직속(px 0)이라 원형 아이콘이 텍스트보다 왼쪽으로 나가던 것 수정. */}
        <DialogBody>
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pullim-blue-50">
                  <Icon className="h-4 w-4 text-pullim-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </DialogBody>

        <DialogFooter className="mt-2 flex gap-2">
          <Link
            href="/planner/onboarding"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-center text-xs font-semibold text-muted-foreground hover:bg-pullim-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
          >
            <BookOpen className="mr-1 inline h-3.5 w-3.5" />
            전체 가이드
          </Link>
          {/* onClick 생략 — DialogClose가 onOpenChange(false)를 발화해 onClose가 한 번만 호출됨 */}
          <DialogClose
            className="flex-1 rounded-xl bg-pullim-blue-600 py-2.5 text-xs font-bold text-white hover:bg-pullim-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
          >
            바로 시작
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
