'use client';

import { useState } from 'react';
import { Send, ShieldCheck, Phone } from 'lucide-react';
import { toast } from 'sonner';
import {
  consentTypeMeta, currentParent, consentLog,
  type ConsentType, type ConsentLog,
} from '@/lib/mock';
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ParentReportCard } from './parent-report-card';
import { cn } from '@/lib/utils';

type ScopeOption = '이번 주만' | '이번 달만' | '계속';

const SCOPE_OPTIONS: ScopeOption[] = ['이번 주만', '이번 달만', '계속'];

const DEFAULT_TYPES: ConsentType[] = ['weekly_report', 'weak_nodes'];

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

/**
 * 부모 공유 동의 모달.
 * 학생이 어떤 데이터를 공유할지 + 만료 범위 + 수신자 확인.
 *
 * 데모: consentLog 배열에 push (in-memory mutation, 다음 페이지 새로고침 시 초기화).
 * Phase 2 학부모 영역에서 이 로그를 읽어 알림 피드에 노출.
 */
export function ConsentDialog({ open, onOpenChange }: Props) {
  const [selected, setSelected] = useState<Set<ConsentType>>(new Set(DEFAULT_TYPES));
  const [scope, setScope] = useState<ScopeOption>('이번 주만');

  function toggleType(t: ConsentType) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function confirm() {
    if (selected.size === 0) {
      toast.error('공유할 항목을 1개 이상 선택해주세요');
      return;
    }
    const now = new Date();
    const expiresAt =
      scope === '이번 주만' ? new Date(now.getTime() + 7 * 86400000).toISOString()
      : scope === '이번 달만' ? new Date(now.getTime() + 30 * 86400000).toISOString()
      : undefined;

    // in-memory mutation — 데모상 다른 컴포넌트가 다음 진입 시 읽음
    selected.forEach(type => {
      const entry: ConsentLog = {
        id: `consent_${Date.now()}_${type}`,
        parentId: currentParent.id,
        studentId: 'student_001',
        type,
        grantedAt: now.toISOString(),
        expiresAt,
        scopeLabel: scope,
      };
      consentLog.push(entry);
    });

    toast.success(`📨 ${currentParent.relation === 'mother' ? '어머니' : '보호자'}께 카톡으로 전송됐어요`, {
      description: `${selected.size}개 항목 · ${scope} 동의 — 부모 앱에서 받기 가능`,
      duration: 3500,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="text-pullim-blue-600 text-[length:var(--text-xs)] font-bold tracking-wider uppercase">
            <ShieldCheck aria-hidden className="mr-1 inline-block h-3 w-3" />
            데이터 공유 동의
          </span>
          <DialogTitle>부모님께 회고 공유</DialogTitle>
          <DialogDescription>
            동의한 항목·기간 동안만 부모님 앱에서 볼 수 있어요. 언제든 철회 가능.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        {/* 부모가 받는 카드 — 미리보기 */}
        <ParentReportCard />

        {/* 수신자 */}
        <section className="bg-pullim-slate-50 flex items-center gap-3 rounded-lg p-3">
          <span className="bg-pullim-blue-100 text-pullim-blue-700 inline-flex h-9 w-9 items-center justify-center rounded-lg">
            <Phone className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 text-xs">
            <div className="text-pullim-slate-900 font-bold">{currentParent.name}</div>
            <div className="text-pullim-slate-500 font-mono">
              {currentParent.phone}
              {currentParent.kakaoId && (
                <span className="text-pullim-slate-400 ml-1">· @{currentParent.kakaoId}</span>
              )}
            </div>
          </div>
        </section>

        {/* 항목 체크 */}
        <section>
          <h4 className="text-pullim-slate-700 mb-2 text-[length:var(--text-xs)] font-bold tracking-wider uppercase">
            공유할 항목
          </h4>
          <ul className="space-y-1.5">
            {(Object.keys(consentTypeMeta) as ConsentType[]).map(type => {
              const meta = consentTypeMeta[type];
              const checked = selected.has(type);
              return (
                <li key={type}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs transition-colors',
                      checked
                        ? 'border-pullim-blue-300 bg-pullim-blue-50/40'
                        : 'border-pullim-slate-200 hover:border-pullim-slate-300',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleType(type)}
                      className="mt-0.5 h-4 w-4 accent-pullim-blue-600"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-pullim-slate-900 flex items-center gap-1.5 font-bold">
                        {meta.label}
                        {meta.sensitive && (
                          <span className="bg-pullim-warn-bg text-pullim-warn-ink rounded-full px-1.5 py-0.5 text-[length:var(--text-xs)] font-bold">
                            민감
                          </span>
                        )}
                      </div>
                      <div className="text-pullim-slate-500 mt-0.5 text-[length:var(--text-xs)]">
                        {meta.description}
                      </div>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 만료 */}
        <section>
          <h4 className="text-pullim-slate-700 mb-2 text-[length:var(--text-xs)] font-bold tracking-wider uppercase">
            동의 기간
          </h4>
          <div role="radiogroup" aria-label="동의 기간" className="bg-pullim-slate-100 inline-flex w-full items-center gap-0.5 rounded-lg p-0.5">
            {SCOPE_OPTIONS.map(s => {
              const selected = scope === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setScope(s)}
                  className={cn(
                    'flex-1 rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                    selected
                      ? 'bg-card text-pullim-blue-700 shadow-pullim-sm'
                      : 'text-pullim-slate-600 hover:text-pullim-slate-900',
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </section>

        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" onClick={confirm} className="bg-pullim-blue-600 text-white hover:bg-pullim-blue-700">
            <Send className="mr-1 h-3.5 w-3.5" />
            카톡 전송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
