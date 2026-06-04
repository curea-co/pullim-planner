'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthCard } from '../components/auth-card';
import { FormField } from '../components/form-field';

export type SignupFields = {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
};
export type SignupErrors = Partial<Record<keyof SignupFields, string>>;

type Props = {
  values: SignupFields;
  errors: SignupErrors;
  submitting: boolean;
  onChange: <K extends keyof SignupFields>(field: K, value: string) => void;
  onEmailBlur: () => void;
  onSubmit: () => void;
};

export function SignupPresenter({
  values,
  errors,
  submitting,
  onChange,
  onEmailBlur,
  onSubmit,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <AuthCard
      title="회원가입"
      subtitle="시험까지의 시간을 함께 설계해요"
      footer={
        <>
          이미 계정이 있으신가요?{' '}
          <Link
            href="/login"
            className="text-pullim-blue-600 font-semibold hover:underline"
          >
            로그인
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        <FormField
          label="이름"
          autoComplete="name"
          placeholder="이름"
          value={values.name}
          error={errors.name}
          disabled={submitting}
          onChange={(e) => onChange('name', e.target.value)}
        />

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
          onBlur={onEmailBlur}
        />

        <div className="relative">
          <FormField
            label="비밀번호"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="영문·숫자·특수문자 포함 8자 이상"
            value={values.password}
            error={errors.password}
            hint="영문·숫자·특수문자를 각각 1개 이상 포함해주세요."
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

        <FormField
          label="비밀번호 확인"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="비밀번호 다시 입력"
          value={values.passwordConfirm}
          error={errors.passwordConfirm}
          disabled={submitting}
          onChange={(e) => onChange('passwordConfirm', e.target.value)}
        />

        <Button type="submit" size="lg" disabled={submitting} className="mt-1">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          회원가입
        </Button>
      </form>
    </AuthCard>
  );
}
