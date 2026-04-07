import type { IAuthBffClient } from '../ports/auth-api.port';

export function createLogoutUseCase(bff: IAuthBffClient) {
  return async function logout(): Promise<void> {
    await bff.logout();
  };
}
