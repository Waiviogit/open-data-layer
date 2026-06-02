import { Suspense } from 'react';

import { ParallelModalSlot } from './parallel-modal-slot';
import { AppHeaderUser } from './app-header-user.server';

import { LoginModalProvider } from '@/modules/auth';
import { AppHeader } from '@/modules/app-header';
import {
  AppShell,
  BottomNav,
  LayoutProvider,
} from '@/shared/presentation/layout';

export default function AppRouteGroupLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <LayoutProvider>
      <LoginModalProvider>
        <AppShell
          header={
            <Suspense fallback={<AppHeader user={null} />}>
              <AppHeaderUser />
            </Suspense>
          }
          bottomNav={<BottomNav />}
          className="py-section-y-sm"
        >
          {children}
        </AppShell>
        <ParallelModalSlot>{modal}</ParallelModalSlot>
      </LoginModalProvider>
    </LayoutProvider>
  );
}
