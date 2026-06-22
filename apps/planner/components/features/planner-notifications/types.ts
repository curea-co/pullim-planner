/**
 * 알림 도메인 타입.
 * Phase γ에서 pullim-api 알림 엔티티로 교체 예정.
 */

export type NotificationType = 'streak' | 'friend' | 'report' | 'burnout' | 'system';

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  read: boolean;
};
