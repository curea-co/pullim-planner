import Link from 'next/link';
import { BookOpen, Users } from 'lucide-react';

type EmptyVariant = 'no-setting' | 'no-proofs' | 'no-friends';

interface EmptyStateProps {
  variant: EmptyVariant;
}

const CONFIG: Record<EmptyVariant, { icon: React.ElementType; title: string; desc: string; cta: { label: string; href: string } }> = {
  'no-setting': {
    icon: BookOpen,
    title: '공유를 시작해보세요',
    desc: '주제 한 줄, 톤, 목표를 정하면\n오늘 학습이 인증 카드가 됩니다.',
    cta: { label: '공유 세팅하기', href: '/planner/share/setup' },
  },
  'no-proofs': {
    icon: BookOpen,
    title: '아직 인증 카드가 없어요',
    desc: '오늘 학습이 끝나면\n한 장으로 인증해보세요.',
    cta: { label: '오늘 공부 인증하기', href: '/planner/share/proof/new' },
  },
  'no-friends': {
    icon: Users,
    title: '아직 친구가 없어요',
    desc: '같이 달릴 친구를 초대해볼까요?',
    cta: { label: '친구 추가하기', href: '/planner/share/friends' },
  },
};

export function EmptyState({ variant }: EmptyStateProps) {
  const { icon: Icon, title, desc, cta } = CONFIG[variant];
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pullim-slate-100">
        <Icon className="h-6 w-6 text-pullim-slate-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{desc}</p>
      </div>
      <Link
        href={cta.href}
        className="mt-1 inline-flex items-center rounded-xl bg-pullim-blue-600 px-4 py-2 text-sm font-bold text-white shadow-pullim-sm hover:bg-pullim-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1"
      >
        {cta.label}
      </Link>
    </div>
  );
}
