'use client';

import { Flame, Users, BarChart2, AlertTriangle, Bell } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import type { Notification } from '../containers/NotificationsContainer';
import { cn } from '@/lib/utils';

const TYPE_ICON: Record<Notification['type'], React.ElementType> = {
  streak:  Flame,
  friend:  Users,
  report:  BarChart2,
  burnout: AlertTriangle,
  system:  Bell,
};

const TYPE_COLOR: Record<Notification['type'], string> = {
  streak:  'bg-pullim-lemon/20 text-pullim-blue-700',
  friend:  'bg-pullim-blue-50 text-pullim-blue-600',
  report:  'bg-pullim-slate-100 text-pullim-slate-600',
  burnout: 'bg-red-50 text-red-500',
  system:  'bg-pullim-slate-100 text-pullim-slate-500',
};

interface NotificationsPresenterProps {
  notifications: Notification[];
}

export default function NotificationsPresenter({ notifications }: NotificationsPresenterProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader
        title="알림"
        description={unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : '모두 읽었어요'}
      />
      {notifications.length === 0 ? (
        <div className="py-16 text-center text-xs text-muted-foreground">알림이 없어요</div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type];
            return (
              <li
                key={n.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors',
                  !n.read && 'border-pullim-blue-100 bg-pullim-blue-50/30',
                )}
              >
                <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', TYPE_COLOR[n.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-semibold', n.read ? 'text-foreground' : 'text-pullim-blue-700')}>
                    {n.title}
                    {!n.read && (
                      <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-pullim-blue-500 align-middle" />
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-pullim-slate-400">{n.time}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
