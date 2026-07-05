'use client';

import { PageHeader } from '@/components/shell/page-header';
import { Input } from '@/components/ui/input';
import { VISIBILITY_LABEL } from '../types';
import type { Friend, DiscoverableUser } from '../types';
import { UserCheck, UserX, UserPlus, Search, Check, Star } from 'lucide-react';

interface FriendsPresenterProps {
  accepted: Friend[];
  pending: Friend[];
  query: string;
  searchResults: DiscoverableUser[];
  requestedIds: string[];
  onQueryChange: (q: string) => void;
  onSendRequest: (user: DiscoverableUser) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onToggleCloseFriend: (id: string) => void;
}

export default function FriendsPresenter({
  accepted,
  pending,
  query,
  searchResults,
  requestedIds,
  onQueryChange,
  onSendRequest,
  onAccept,
  onReject,
  onToggleCloseFriend,
}: FriendsPresenterProps) {
  const hasQuery = query.trim().length > 0;
  return (
    <>
      <PageHeader
        title="친구 관리"
        description="친한 친구에게만 인증이 공개됩니다"
      />
      <div className="space-y-4">
        {/* 친구 찾기 — 닉네임으로 검색해 요청. 피어 안전상 학년·실명 미노출(닉네임·활동만). */}
        <section>
          <h2 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            친구 찾기
          </h2>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="닉네임으로 친구 찾기"
              aria-label="닉네임으로 친구 찾기"
              className="pl-9"
            />
          </div>
          {!hasQuery ? (
            <p className="px-1 pt-2 text-xs text-muted-foreground">
              닉네임으로 친구를 찾아 요청을 보내세요.
            </p>
          ) : searchResults.length === 0 ? (
            <p className="px-1 pt-2 text-xs text-muted-foreground">
              &lsquo;{query.trim()}&rsquo; 검색 결과가 없어요.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {searchResults.map((u) => {
                const requested = requestedIds.includes(u.userId);
                return (
                  <li key={u.userId} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pullim-slate-100 text-sm font-bold text-pullim-slate-600">
                      {u.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{u.name}</p>
                      {u.proofCount !== undefined && (
                        <p className="text-xs text-muted-foreground">인증 {u.proofCount}회</p>
                      )}
                    </div>
                    {requested ? (
                      <span className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                        <Check className="h-3.5 w-3.5" /> 요청 보냄
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSendRequest(u)}
                        className="flex items-center gap-1 rounded-lg bg-pullim-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-pullim-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> 친구 요청
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {pending.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              받은 요청 {pending.length}
            </h2>
            <ul className="space-y-2">
              {pending.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pullim-slate-100 text-sm font-bold text-pullim-slate-600">
                    {f.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{f.name}</p>
                    {f.grade && <p className="text-xs text-muted-foreground">{f.grade}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAccept(f.id)}
                      className="flex items-center gap-1 rounded-lg bg-pullim-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-pullim-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
                    >
                      <UserCheck className="h-3.5 w-3.5" /> 수락
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(f.id)}
                      className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-pullim-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
                    >
                      <UserX className="h-3.5 w-3.5" /> 거절
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            친구 {accepted.length}
          </h2>
          {accepted.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">아직 친구가 없어요</p>
          ) : (
            <ul className="space-y-2">
              {accepted.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <div className="relative">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pullim-slate-100 text-sm font-bold text-pullim-slate-600">
                      {f.name[0]}
                    </div>
                    {f.isCloseFriend && (
                      <Star className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 fill-pullim-lemon text-pullim-lemon" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {f.name}
                      {f.isCloseFriend && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">친한 친구</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {f.grade && `${f.grade} · `}인증 {f.proofCount}회
                      {f.latestProofDate && ` · 최근 ${f.latestProofDate}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleCloseFriend(f.id)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 ${
                      f.isCloseFriend
                        ? 'border-pullim-lemon bg-pullim-lemon/10 text-pullim-blue-700'
                        : 'border-border text-muted-foreground hover:bg-pullim-slate-50'
                    }`}
                  >
                    {f.isCloseFriend ? '★ 친한 친구' : '친한 친구 지정'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="rounded-xl bg-pullim-slate-50 px-4 py-3 text-xs text-muted-foreground">
          인증 카드의 기본 공개 범위는{' '}
          <span className="font-semibold text-foreground">{VISIBILITY_LABEL.close_friends}</span>입니다.
          내가 직접 지정한 친한 친구에게만 보여요.
        </div>
      </div>
    </>
  );
}
