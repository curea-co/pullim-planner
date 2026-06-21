'use client';

import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthCard } from '../components/auth-card';
import { FormField } from '../components/form-field';

export type LoginFields = { email: string; password: string };
export type LoginErrors = Partial<Record<keyof LoginFields, string>>;

type Props = {
  values: LoginFields;
  errors: LoginErrors;
  submitting: boolean;
  onChange: <K extends keyof LoginFields>(field: K, value: string) => void;
  onSubmit: () => void;
};

export function LoginPresenter({
  values,
  errors,
  submitting,
  onChange,
  onSubmit,
}: Props) {
  // 비밀번호 표시 토글 — UI 전용 작은 상태(컨벤션 예외).
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <AuthCard
      title="로그인"
      subtitle="풀림 플래너에 오신 걸 환영해요"
      footer={
        // 흡수 §10: 자체 회원가입 폐기 — 가입은 중앙 로그인(KCB)으로 통합 예정.
        <span className="text-pullim-slate-500">
          가입은 중앙 로그인으로 통합될 예정이에요.
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        <FormField
          label="이메일"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={values.email}
          error={errors.email}
          disabled={submitting}
          onChange={(e) => onChange('email', e.target.value)}
        />

        <div className="relative">
          <FormField
            label="비밀번호"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="비밀번호"
            value={values.password}
            error={errors.password}
            disabled={submitting}
            className="pr-9"
            onChange={(e) => onChange('password', e.target.value)}
          />
          <button
            type="button"
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
            className="text-pullim-slate-500 hover:text-pullim-slate-900 absolute top-[30px] right-2.5 inline-flex h-6 w-6 items-center justify-center rounded-md"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        <Button type="submit" size="lg" disabled={submitting} className="mt-1">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          로그인
        </Button>
      </form>
    </AuthCard>
  );
}
