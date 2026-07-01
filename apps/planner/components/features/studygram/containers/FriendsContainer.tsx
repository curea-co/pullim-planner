'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { mockFriends, searchDiscoverableUsers } from '@/lib/mock/studygram';
import type { Friend, DiscoverableUser } from '../types';
import FriendsPresenter from '../presenters/FriendsPresenter';

export default function FriendsContainer() {
  const [friends, setFriends] = useState<Friend[]>(mockFriends);
  const [query, setQuery] = useState('');
  const [requestedIds, setRequestedIds] = useState<string[]>([]);

  const accepted = friends.filter((f) => f.status === 'accepted');
  const pending = friends.filter((f) => f.status === 'pending');

  // 친구 찾기 — 이미 친구/요청받은 사람은 검색 결과에서 제외(요청 보낸 사람은 결과에 남겨 '요청 보냄' 상태 표시).
  const searchResults = useMemo(
    () => searchDiscoverableUsers(query, friends.map((f) => f.userId)),
    [query, friends],
  );

  const handleSendRequest = useCallback((user: DiscoverableUser) => {
    setRequestedIds((prev) => (prev.includes(user.userId) ? prev : [...prev, user.userId]));
    toast.success(`${user.name}님에게 친구 요청을 보냈어요.`);
  }, []);

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
      query={query}
      searchResults={searchResults}
      requestedIds={requestedIds}
      onQueryChange={setQuery}
      onSendRequest={handleSendRequest}
      onAccept={handleAccept}
      onReject={handleReject}
      onToggleCloseFriend={handleToggleCloseFriend}
    />
  );
}
