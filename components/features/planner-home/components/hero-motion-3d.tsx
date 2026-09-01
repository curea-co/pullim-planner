import { cn } from '@/lib/utils';

/**
 * 홈 히어로 3D 장식 — 형제 앱(Q·입시·라이팅 코치) 공통 기법의 플래너 버전.
 * 시간블록 미니 카드 3장을 translateZ 깊이별로 쌓고 부모 스택만 틸트 진동.
 * 순수 CSS(라이브러리 0): 틸트=부모 transform 키프레임, 플로트=카드 translate 키프레임
 * (translate는 transform과 독립 속성이라 카드의 정적 3D transform을 덮지 않는다).
 */
export function HeroMotion3D() {
  return (
    <div
      aria-hidden
      data-hero-3d
      className="absolute inset-y-0 right-0 hidden w-[44%] max-w-[320px] [perspective:1100px] sm:block"
    >
      <div className="absolute inset-0 grid place-items-center [transform-style:preserve-3d] motion-safe:animate-[planner-hero-tilt_10s_ease-in-out_infinite] motion-reduce:[transform:rotateY(-14deg)_rotateX(6deg)]">
        <BlockCard
          time="09:00"
          bar="w-10"
          className="opacity-50 [transform:translateZ(-46px)_translateX(-30px)_translateY(-8px)_rotate(-7deg)] motion-safe:animate-[planner-hero-float_7s_ease-in-out_infinite]"
        />
        <BlockCard
          time="14:00"
          bar="w-14"
          className="opacity-80 [transform:translateZ(0px)] motion-safe:animate-[planner-hero-float_7s_ease-in-out_-2.3s_infinite]"
        />
        <BlockCard
          time="19:30"
          bar="w-12"
          checked
          className="[transform:translateZ(48px)_translateX(26px)_translateY(10px)_rotate(6deg)] motion-safe:animate-[planner-hero-float_7s_ease-in-out_-4.6s_infinite]"
        />
      </div>
    </div>
  );
}

/** 시간블록 미니 카드 — 유리질감(글래스) 패널 + 시간 라벨 + 과목 바 */
function BlockCard({
  time, bar, checked, className,
}: {
  time: string;
  bar: string;
  checked?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'absolute h-[76px] w-[132px] rounded-xl border border-white/25 bg-white/10 p-3 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.45)] backdrop-blur-[2px] [transform-style:preserve-3d]',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[length:var(--text-2xs)] font-medium tracking-wide text-white/80">{time}</span>
        {checked && <span className="bg-pullim-lemon h-2 w-2 rounded-full" />}
      </div>
      <div className="mt-2.5 h-1.5 w-16 rounded-full bg-white/30" />
      <div className={cn('mt-1.5 h-1.5 rounded-full', bar, checked ? 'bg-pullim-lemon' : 'bg-white/50')} />
    </div>
  );
}
