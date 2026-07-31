import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { RequireAuth } from '@/components/shell/require-auth';

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell role="student">{children}</AppShell>
    </RequireAuth>
  );
}
