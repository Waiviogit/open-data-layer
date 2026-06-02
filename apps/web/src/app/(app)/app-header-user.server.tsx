import { AppHeader } from '@/modules/app-header';
import { getRequestUser } from '@/shared/infrastructure/auth/get-request-user.server';

export async function AppHeaderUser() {
  const current = await getRequestUser();
  const headerUser = current ? { username: current.username } : null;
  return <AppHeader user={headerUser} />;
}
