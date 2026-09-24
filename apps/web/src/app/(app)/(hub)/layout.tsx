import { AppSectionNav } from '@/modules/app-header';
import {
  InstantNavigationProvider,
  OptimisticNavProvider,
} from '@/shared/presentation';

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <OptimisticNavProvider>
      <InstantNavigationProvider>
        <div className="min-w-0">
          <div className="sticky top-[var(--shell-header-height)] z-30 min-w-0">
            <AppSectionNav />
          </div>
          <div className="min-w-0 lg:overflow-x-clip">{children}</div>
        </div>
      </InstantNavigationProvider>
    </OptimisticNavProvider>
  );
}
