import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginContainer } from '@/components/features/auth/containers/LoginContainer';

export const metadata: Metadata = { title: '로그인' };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContainer />
    </Suspense>
  );
}
