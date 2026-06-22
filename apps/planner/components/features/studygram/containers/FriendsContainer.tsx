'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { mockFriends } from '@/lib/mock/studygram';
import type { Friend } from '../types';
import FriendsPresenter from '../presenters/FriendsPresenter';

export default function FriendsContainer() {
  const [friends, setFriends] = useState<Friend[]>(mockFriends);

  const accepted = friends.filter((f) => f.status === 'accepted');
  const pending = friends.filter((f) => f.status === 'pending');

  const handleAccept = useCallback((id: string) => {
    setFriends((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'accepted' as const } : f)),
    );
    toast.success('친구 요청을 수락했어요.');
  }, []);

  const handleReject = useCallback((id: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
    toast('친구 요청을 거절했어요.');
  }, []);

  const handleToggleCloseFriend = useCallback((id: string) => {
    setFriends((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isCloseFriend: !f.isCloseFriend } : f)),
    );
  }, []);

  return (
    <FriendsPresenter
      accepted={accepted}
      pending={pending}
      onAccept={handleAccept}
      onReject={handleReject}
      onToggleCloseFriend={handleToggleCloseFriend}
    />
  );
}
