import NotificationsPresenter from '../presenters/NotificationsPresenter';
import type { Notification } from '../types';

const mockNotifications: Notification[] = [
  {
    id: 'n-001',
    type: 'streak',
    title: '🔥 5일 연속 달성!',
    body: '5일 연속 플래너를 완료했어요. 내일도 파이팅!',
    time: '방금 전',
    read: false,
  },
  {
    id: 'n-002',
    type: 'friend',
    title: '현우님이 친구 요청을 보냈어요',
    body: '수락하면 서로 공부 인증을 볼 수 있어요.',
    time: '1시간 전',
    read: false,
  },
  {
    id: 'n-003',
    type: 'report',
    title: '주간 리포트가 완성됐어요',
    body: '이번 주 총 14시간 32분 학습. 지난 주 대비 +1.5시간!',
    time: '어제',
    read: true,
  },
  {
    id: 'n-004',
    type: 'burnout',
    title: '번아웃 주의 — 오늘 블록 줄여봐요',
    body: '최근 3일 완료율이 65% 아래예요. 오늘 하루 쉬어가도 괜찮아요.',
    time: '2일 전',
    read: true,
  },
  {
    id: 'n-005',
    type: 'system',
    title: '공유 세팅을 완료해보세요',
    body: '공스타그램 세팅을 마치면 친구와 공부 인증을 주고받을 수 있어요.',
    time: '3일 전',
    read: true,
  },
];

export default function NotificationsContainer() {
  return <NotificationsPresenter notifications={mockNotifications} />;
}
