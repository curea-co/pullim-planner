import { CalendarClock, Calendar, PlayCircle, Smile, HeartPulse, Brain, PencilLine, BookOpen } from 'lucide-react';
import { OnboardingTemplate } from '@/components/shell/onboarding-template';
import { MockBrowser } from '@/components/shell/mock-browser';
import { SideTimeline24 } from '@/components/planner/side-timeline-24';
import { ConditionSlider } from '@/components/planner/condition-slider';
import { BurnoutCard } from '@/components/planner/burnout-card';
import { PedagogyTag } from '@/components/planner/pedagogy-tag';
import { todayBlocks, currentPersona, getDday } from '@/lib/mock';

export default function PlannerOnboardingPage() {
  const dday = getDday(currentPersona);
  const ddayLabel = dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${Math.abs(dday)}`;

  return (
    <OnboardingTemplate
      featureName="풀림 플래너"
      Icon={CalendarClock}
      identity="시간표 앱이 아닌 자기조절 도구. 7대 학습과학을 자동 적용하고, 오늘 결과(정답률·감정·시간)가 내일 플랜에 자동 반영되는 매일 재최적화 플라이휠."
      estimatedMin={5}
      steps={[
        {
          Icon: Calendar,
          title: '일/주/월 캘린더로 학습 일정 보기',
          description:
            '시간 블록 단위로 오늘·이번 주·이번 달 학습이 자동 배치돼요. 일간은 24시간 사이드 트래커로, 주간은 요일×블록 타입 그리드, 월간은 30일 히트맵.',
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
                <SideTimeline24 blocks={todayBlocks} ddayLabel={ddayLabel} now="18:50" />
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
        {
          Icon: HeartPulse,
          title: '번아웃 지수 + "쉴래요" 1-tap',
          description:
            '5개 지표(수면·완료율·감정·휴식 수용·쉴래요 빈도) 가중 평균. 임계값 아래 3일 지속 시 시스템이 먼저 휴식 제안.',
          bullets: ['"오늘은 쉴래요" 누르면 오늘 블록 자동 이월', '내일 난이도 20% 하향'],
          screenshotCaption: '실제 번아웃 카드 + 레몬 CTA',
          screenshot: (
            <MockBrowser label="번아웃 모니터링">
              <BurnoutCard />
            </MockBrowser>
          ),
        },
        {
          Icon: Brain,
          title: '7대 교육학 엔진 자동 적용',
          description:
            '블록 카드에 "간격 복습 / 포모도로 / 인지 부하 관리" 같은 엔진 태그가 붙어요. 클릭하면 "왜 이 엔진?"으로 원리 확인 — 교육적 투명성.',
          screenshotCaption: '엔진 태그 — 클릭 시 원리 모달',
          screenshot: (
            <MockBrowser label="블록 카드 — 엔진 태그">
              <div className="space-y-2">
                <div className="text-pullim-slate-700 inline-flex items-center gap-1 text-xs font-bold">
                  <BookOpen aria-hidden className="h-3.5 w-3.5" />
                  미분 기본 공식 시각화
                </div>
                <div className="text-pullim-slate-500 text-[10px]">
                  <span className="font-mono">17:30–18:10</span> · 40분 · 수학
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <PedagogyTag engineId="cognitive_load" size="md" />
                  <PedagogyTag engineId="active_recall" size="md" />
                </div>
                <p className="text-pullim-slate-500 mt-2 text-[10px]">
                  태그 클릭 → 원리·예시 모달 (교육적 투명성)
                </p>
              </div>
            </MockBrowser>
          ),
        },
      ]}
      finalCta={{ label: '풀림 플래너 시작하기', href: '/planner' }}
    />
  );
}
