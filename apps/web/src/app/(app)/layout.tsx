import { LoginModalProvider } from '@/modules/auth';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';
import {
  AppHeader,
  AppShell,
  BottomNav,
  LayoutProvider,
} from '@/shared/presentation/layout';

export default async function AppRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = createCookieAuthContextProvider();
  const current = await auth.getUser();
  const headerUser = current ? { username: current.username } : null;

  return (
    <LayoutProvider>
      <LoginModalProvider>
        <AppShell
          header={<AppHeader user={headerUser} />}
          bottomNav={<BottomNav />}
          className="py-section-y-sm"
        >
          {children}
        </AppShell>
      </LoginModalProvider>
    </LayoutProvider>
  );
}
