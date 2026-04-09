import type { AppHeaderUser } from '../domain/app-header-user';
import { TopNav } from './components/top-nav';

export type AppHeaderProps = {
  user: AppHeaderUser | null;
};

/**
 * Global app chrome: brand, search (MVP stub), session actions.
 */
export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-nav-bg"
      style={{ backdropFilter: 'var(--backdrop-nav)' }}
    >
      <TopNav user={user} />
    </header>
  );
}
