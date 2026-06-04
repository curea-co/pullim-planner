import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignupContainer } from '@/components/features/auth/containers/SignupContainer';

export const metadata: Metadata = { title: '회원가입' };

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContainer />
    </Suspense>
  );
}
