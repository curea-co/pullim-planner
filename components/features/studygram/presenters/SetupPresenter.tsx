'use client';

import { ChevronRight } from 'lucide-react';
import { TONE_PRESETS, type TonePresetId } from '../types';
import { PageHeader } from '@/components/shell/page-header';
import { cn } from '@/lib/utils';

export type SetupStep = 'topic' | 'tone' | 'goal';

/** 세팅 스텝 순서 — Container/Presenter 단일 출처 */
export const SETUP_STEPS: SetupStep[] = ['topic', 'tone', 'goal'];

/** 닉네임 최대 길이 — BE 계약(1~20자)과 일치. */
export const NICKNAME_MAX_LEN = 20;

interface SetupPresenterProps {
  step: SetupStep;
  nickname: string;
  topicLine: string;
  tonePresetId: TonePresetId;
  goalHorizonDays: number;
  goalPostsPerDay: number;
  consentGiven: boolean;
  onNicknameChange: (v: string) => void;
  onTopicChange: (v: string) => void;
  onToneChange: (v: TonePresetId) => void;
  onHorizonChange: (v: number) => void;
  onPostsChange: (v: number) => void;
  onConsentChange: (v: boolean) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  /** 로드 실패 등으로 저장을 막아야 할 때(외부 게이트). true 면 마지막 스텝 저장 비활성. */
  submitDisabled?: boolean;
}

const STEP_LABELS: Record<SetupStep, string> = {
  topic: '① 주제',
  tone:  '② 톤',
  goal:  '③ 목표',
};

const HORIZON_OPTIONS = [30, 50, 100, 180, 365];
const POSTS_OPTIONS = [1, 2, 3];

export default function SetupPresenter({
  step,
  nickname,
  topicLine,
  tonePresetId,
  goalHorizonDays,
  goalPostsPerDay,
  consentGiven,
  onNicknameChange,
  onTopicChange,
  onToneChange,
  onHorizonChange,
  onPostsChange,
  onConsentChange,
  onNext,
  onBack,
  onSubmit,
  submitDisabled = false,
}: SetupPresenterProps) {
  const stepIdx = SETUP_STEPS.indexOf(step);
  const isLast = step === 'goal';
  // 첫 스텝(닉네임+주제) 진행 게이트 — 닉네임 1~20자·주제 비어있지 않아야 다음/저장.
  const topicStepInvalid =
    step === 'topic' &&
    (nickname.trim().length === 0 ||
      nickname.trim().length > NICKNAME_MAX_LEN ||
      topicLine.trim().length === 0);
  // 마지막(목표) 스텝 저장 게이트 — 형식 검증(위 topicStepInvalid) + 외부 게이트(로드 실패 등)만 본다.
  // consentGiven 은 저장 조건이 아니라 게시(BR-4)의 게이트다: 동의 true/false 어느 쪽이든 저장 가능
  // (미동의 저장 = 나중에 게시하려면 켜라는 안내만, 이미 동의한 사용자의 철회 저장도 허용).
  const submitBlocked = isLast && submitDisabled;

  return (
    <>
      <PageHeader
        title="공유 세팅"
        description="오늘부터 꾸준함을 기록해요. 주제 한 줄부터."
      />

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-1.5">
        {SETUP_STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold',
                s === step
                  ? 'bg-pullim-blue-600 text-white'
                  : i < stepIdx
                  ? 'bg-pullim-blue-100 text-pullim-blue-600'
                  : 'bg-pullim-slate-100 text-muted-foreground',
              )}
            >
              {STEP_LABELS[s]}
            </span>
            {i < SETUP_STEPS.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      <div className="space-y-6 pt-2">
        {/* Step 1 — 닉네임 + 주제 */}
        {step === 'topic' && (
          <div className="space-y-6">
            {/* 닉네임(피어 식별) — BE 계약 1~20자, 최초 생성 필수 */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-foreground">
                친구에게 보이는 이름(닉네임)
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => onNicknameChange(e.target.value)}
                maxLength={NICKNAME_MAX_LEN}
                placeholder="예: 풀림러"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>피드·친구 목록에 표시돼요(실명 대신).</span>
                <span>
                  {nickname.length}/{NICKNAME_MAX_LEN}
                </span>
              </div>
            </div>

            {/* 주제 한 줄 */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-foreground">
                나의 공유 주제를 한 문장으로
              </label>
              <textarea
                value={topicLine}
                onChange={(e) => onTopicChange(e.target.value)}
                maxLength={60}
                rows={3}
                placeholder="예: 2027 수능 국어·영어 매일 2시간"
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
              />
              <div className="text-right text-xs text-muted-foreground">{topicLine.length}/60</div>
            </div>
          </div>
        )}

        {/* Step 2 — 톤 */}
        {step === 'tone' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">인증 카드 톤을 고르세요</p>
            <div className="grid grid-cols-1 gap-2">
              {TONE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onToneChange(preset.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1',
                    preset.id === tonePresetId
                      ? 'border-pullim-blue-500 bg-pullim-blue-50'
                      : 'border-border bg-background hover:border-pullim-slate-300',
                  )}
                >
                  <span className="text-xl">{preset.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{preset.label}</p>
                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                  </div>
                  {preset.id === tonePresetId && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-pullim-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — 목표 */}
        {step === 'goal' && (
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">목표 기간(일)</p>
              <div className="flex flex-wrap gap-2">
                {HORIZON_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onHorizonChange(d)}
                    className={cn(
                      'rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                      d === goalHorizonDays
                        ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                        : 'border-border bg-background text-foreground hover:border-pullim-slate-300',
                    )}
                  >
                    D-{d}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">하루 목표 인증 횟수</p>
              <div className="flex gap-2">
                {POSTS_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onPostsChange(n)}
                    className={cn(
                      'flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                      n === goalPostsPerDay
                        ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                        : 'border-border bg-background text-foreground hover:border-pullim-slate-300',
                    )}
                  >
                    {n}회
                  </button>
                ))}
              </div>
            </div>

            {/* 요약 */}
            <div className="rounded-xl bg-pullim-slate-50 px-4 py-3 text-xs text-muted-foreground">
              D-{goalHorizonDays} 동안 총{' '}
              <span className="font-bold text-foreground">
                {goalHorizonDays * goalPostsPerDay}회
              </span>{' '}
              인증을 목표로 합니다.
            </div>

            {/* 공유 동의(opt-in, BE BR-4) — 게시(인증)의 게이트. 저장은 동의 무관 가능(철회 허용). */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => onConsentChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-pullim-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
              />
              <span className="text-sm text-foreground">
                학습 기록을 친구에게 공유하는 데 동의합니다.
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  동의해야 인증카드를 게시할 수 있어요. 언제든 설정에서 변경할 수 있어요.
                </span>
              </span>
            </label>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-2 pt-2">
          {stepIdx > 0 && (
            <button
              type="button"
              onClick={onBack}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground hover:bg-pullim-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
            >
              이전
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? onSubmit : onNext}
            disabled={topicStepInvalid || submitBlocked}
            className="flex-1 rounded-xl bg-pullim-blue-600 py-3 text-sm font-bold text-white shadow-pullim-sm hover:bg-pullim-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 disabled:opacity-40"
          >
            {isLast ? '저장하고 시작하기' : '다음'}
          </button>
        </div>
      </div>
    </>
  );
}
