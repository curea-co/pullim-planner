import { CalendarClock, Calendar, PlayCircle, Smile, PencilLine } from 'lucide-react';
import { OnboardingTemplate } from '@/components/shell/onboarding-template';
import { MockBrowser } from '@/components/shell/mock-browser';
import { SideTimeline24 } from '@/components/features/planner-home/components/side-timeline-24';
import { ConditionSlider } from '@/components/features/planner-home/components/condition-slider';
import { todayBlocks } from '@/lib/mock';

interface OnboardingPresenterProps {
  ddayLabel: string;
}

export default function OnboardingPresenter({ ddayLabel }: OnboardingPresenterProps) {
  return (
    <OnboardingTemplate
      featureName="풀림 플래너"
      Icon={CalendarClock}
      identity="시험 목표부터 매일 학습까지 한곳에서 계획하고 기록하는 학습 플래너 — 일·주·월 시간표, 루틴, 성장 리포트, 공부 공유."
      estimatedMin={5}
      steps={[
        {
          Icon: Calendar,
          title: '일/주/월 캘린더로 학습 일정 보기',
          description:
            '시간 블록 단위로 오늘·이번 주·이번 달 학습을 계획해요. 일간은 24시간 사이드 트래커, 주간은 요일×블록 타입 그리드, 월간은 30일 히트맵.',
          bullets: [
            '일간: 24시간 사이드 트래커 — 30분 단위 셀에 학습 시간이 형광펜처럼 채워짐',
            '주간: 7일 그리드 — 오늘 열은 파랑 강조',
            '월간: 30일 히트맵 — D-day 시험 일정 깃발 마커 표시',
          ],
          cta: { label: '캘린더 보기', href: '/planner/calendar' },
          screenshotCaption: '24시간 사이드 트래커 — 학습 점유 시각화',
          screenshot: (
            <MockBrowser label="study/planner/day">
              <div className="bg-pullim-slate-50/40 rounded-lg p-3">
                <SideTimeline24 blocks={todayBlocks} ddayLabel={ddayLabel} now="18:50" trimToBlocks />
              </div>
            </MockBrowser>
          ),
        },
        {
          Icon: PlayCircle,
          title: '다음 블록 hero에서 바로 시작',
          description:
            '홈 화면 큰 카드에 다음 학습 블록이 떠 있어요. "지금 시작하기" 한 번이면 해당 기능(무한풀기·튜터·비주얼 등)으로 직진.',
          signature: true,
          screenshotCaption: '다음 블록 hero (그라데이션 카드)',
          screenshot: (
            <MockBrowser label="다음 블록">
              <div className="from-pullim-blue-600 to-pullim-blue-500 rounded-xl bg-gradient-to-br p-3 text-white">
                <div className="text-pullim-blue-100 inline-flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase">
                  <PencilLine aria-hidden className="h-3 w-3" />
                  문제 풀이 · 수학
                </div>
                <h3 className="mt-1 text-sm font-bold">미분 — 적응형 문제 풀이</h3>
                <p className="text-pullim-blue-100 mt-0.5 text-[11px]">
                  <span className="font-mono font-semibold">18:25–19:25</span> · 60분 예상
                </p>
                <button className="bg-white text-pullim-blue-700 mt-2.5 inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold">
                  ▶ 지금 시작하기
                </button>
              </div>
            </MockBrowser>
          ),
        },
        {
          Icon: Smile,
          title: '오늘 컨디션 슬라이더',
          description:
            '매일 아침 컨디션을 5단계로 보고하면 오늘 블록 난이도가 ±20% 자동 조정. 피곤한 날엔 쉽게, 컨디션 좋은 날엔 어렵게.',
          bullets: ['😴 피곤 → -20%', '🙂 보통 → 기본', '🤩 쌩쌩 → +20%'],
          screenshotCaption: '실제 컨디션 슬라이더',
          screenshot: (
            <MockBrowser label="컨디션 입력">
              <ConditionSlider initial={3} />
            </MockBrowser>
          ),
        },
      ]}
      finalCta={{ label: '풀림 플래너 시작하기', href: '/planner' }}
    />
  );
}
