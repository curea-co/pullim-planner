import { CalendarClock, Calendar, PlayCircle, Smile, PencilLine, BarChart2 } from 'lucide-react';
import { OnboardingTemplate } from '@/components/shell/onboarding-template';
import { MockBrowser } from '@/components/shell/mock-browser';
import { SideTimeline24 } from '@/components/features/planner-home/components/side-timeline-24';
import { ConditionSlider } from '@/components/features/planner-home/components/condition-slider';
import { AccuracyTrendChart } from '@/components/features/planner-reports/components/accuracy-trend-chart';
import { REPORTS_ENABLED } from '@/lib/flags';
import { todayBlocks } from '@/lib/mock';

interface OnboardingPresenterProps {
  ddayLabel: string;
}

export default function OnboardingPresenter({ ddayLabel }: OnboardingPresenterProps) {
  return (
    <OnboardingTemplate
      featureName="풀림 플래너"
      Icon={CalendarClock}
      identity="학습과학 원리에 따라 스스로 공부 계획을 세워 보아요. 친구와 공유할 수도 있어요."
      estimatedMin={5}
      steps={[
        {
          Icon: Calendar,
          title: '일/주/월 캘린더로 학습 일정 보기',
          description:
            '시간 블록 단위로 오늘·이번 주·이번 달 학습을 계획해요. 하루는 24시간 시간표로, 한 주는 요일별 표로, 한 달은 학습 캘린더로 봐요.',
          bullets: [
            '하루: 24시간 시간표 — 30분 칸에 공부한 시간이 형광펜처럼 채워져요',
            '한 주: 7일 표 — 오늘 칸은 파랗게 강조돼요',
            '한 달: 30일 학습 캘린더 — 시험 날짜는 깃발로 표시돼요',
          ],
          cta: { label: '캘린더 보기', href: '/planner/calendar' },
          screenshotCaption: '24시간 시간표 — 공부한 시간이 한눈에',
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
          title: '다음 학습 카드에서 바로 시작',
          description:
            '홈 화면 큰 카드에 다음 학습 블록이 떠 있어요. "지금 시작하기" 한 번이면 해당 기능(무한풀기·튜터·비주얼 등)으로 직진.',
          signature: true,
          screenshotCaption: '다음 학습 카드',
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
          title: '오늘 컨디션 알려주기',
          description:
            '매일 아침 컨디션을 5단계로 보고하면 오늘 블록 난이도가 ±20% 자동 조정. 피곤한 날엔 쉽게, 컨디션 좋은 날엔 어렵게.',
          bullets: ['😴 피곤 → -20%', '🙂 보통 → 기본', '🤩 쌩쌩 → +20%'],
          screenshotCaption: '컨디션 입력 화면',
          screenshot: (
            <MockBrowser label="컨디션 입력">
              <ConditionSlider initial={3} />
            </MockBrowser>
          ),
        },
        {
          // 성장 리포트 — soft open 게이트(REPORTS_ENABLED)에 따라 오픈/출시 예정 문구 분기 (welcome-modal과 정합, codex)
          Icon: BarChart2,
          title: REPORTS_ENABLED ? '성장 리포트로 돌아보기' : '성장 리포트 — 출시 예정',
          description: REPORTS_ENABLED
            ? '하루·한 주·한 달 공부를 회고 화면에서 돌아봐요. 완료율과 학습 시간, 정답률이 어떻게 변했는지 흐름으로 보여 드려요.'
            : '하루·한 주·한 달 공부를 돌아보는 회고 화면을 준비하고 있어요. 완료율과 학습 시간, 정답률이 어떻게 변했는지 흐름으로 보여 드려요. 열리면 왼쪽 메뉴에 나타나요.',
          bullets: [
            '오늘 회고: 완료율·컨디션을 한 줄로 기록해요',
            '주간 회고: 학습 시간과 정답률 추세를 그래프로 봐요',
            '월간 회고: 한 달 성장을 모아 부모님과 공유할 수 있어요',
          ],
          ...(REPORTS_ENABLED ? { cta: { label: '성장 리포트 보기', href: '/planner/reports' } } : {}),
          screenshotCaption: REPORTS_ENABLED
            ? '성장 리포트 — 정답률 추세'
            : '성장 리포트 미리보기 — 정답률 추세 (출시 예정)',
          screenshot: (
            <MockBrowser label="study/planner/reports">
              <AccuracyTrendChart />
            </MockBrowser>
          ),
        },
      ]}
      finalCta={{ label: '풀림 플래너 시작하기', href: '/planner' }}
    />
  );
}
