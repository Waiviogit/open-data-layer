import {
  AppHeader,
  AppShell,
  BottomNav,
  LayoutProvider,
} from '@/shared/presentation/layout';

export default function AppRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutProvider>
      <AppShell
        header={<AppHeader />}
        bottomNav={<BottomNav />}
        className="py-section-y-sm"
      >
        {children}
      </AppShell>
    </LayoutProvider>
  );
}
