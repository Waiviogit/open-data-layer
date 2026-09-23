import { getSegmentsAfterAccount } from '../presentation/components/profile-path';

/** Transfers tab is `/@name/transfers` (and nested transfer routes). */
export function isUserProfileTransfersTab(pathname: string): boolean {
  return getSegmentsAfterAccount(pathname)[0] === 'transfers';
}

/** Public authorizations landing page: `/@name/permissions`. */
export function isUserProfilePermissionsTab(pathname: string): boolean {
  return getSegmentsAfterAccount(pathname)[0] === 'permissions';
}

/** Wallet center column: transfer history or authorizations. */
export function isUserProfileWalletSection(pathname: string): boolean {
  return (
    isUserProfileTransfersTab(pathname) || isUserProfilePermissionsTab(pathname)
  );
}
