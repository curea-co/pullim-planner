import NotificationsPresenter from '../presenters/NotificationsPresenter';
import type { Notification } from '../types';

// 알림(리마인더·푸시) BE·웹푸시 발송 인프라 미구현(soft-open, NOTIFICATIONS_ENABLED off) —
// 데모 알림을 지워 "실제 알림이 온 것" 오해 방지. Presenter가 빈 배열이면 "알림이 없어요" 노출.
// 실 알림 파이프라인 준비 시 이 소스를 API 조회로 교체.
const notifications: Notification[] = [];

export default function NotificationsContainer() {
  return <NotificationsPresenter notifications={notifications} />;
}
