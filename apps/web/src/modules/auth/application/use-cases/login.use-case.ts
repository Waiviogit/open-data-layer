import type { IAuthBffClient } from '../ports/auth-api.port';
import type { WalletFacade } from '../../domain/types';

export function createLoginUseCase(facade: WalletFacade) {
  return async function login(
    providerId: Parameters<WalletFacade['login']>[0],
    username: string,
  ): Promise<void> {
    await facade.login(providerId, username);
  };
}

export function createHiveAuthVerifyUseCase(bff: IAuthBffClient) {
  return async function verifyHiveAuth(input: {
    challengeId: string;
    username: string;
    authData: string;
  }): Promise<void> {
    await bff.verifyHiveAuth(input);
  };
}
