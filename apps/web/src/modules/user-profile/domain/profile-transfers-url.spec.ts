import {
  isUserProfilePermissionsTab,
  isUserProfileTransfersTab,
  isUserProfileWalletSection,
} from './profile-transfers-url';

describe('isUserProfileTransfersTab', () => {
  it('matches public profile transfers URLs', () => {
    expect(isUserProfileTransfersTab('/@alice/transfers')).toBe(true);
    expect(isUserProfileTransfersTab('/@alice/transfers/details')).toBe(true);
  });

  it('matches internal user-profile transfers URLs', () => {
    expect(isUserProfileTransfersTab('/user-profile/alice/transfers')).toBe(true);
    expect(isUserProfileTransfersTab('/user-profile/alice/transfers/details')).toBe(true);
  });

  it('does not match other profile tabs', () => {
    expect(isUserProfileTransfersTab('/@alice/activity')).toBe(false);
    expect(isUserProfileTransfersTab('/@alice')).toBe(false);
    expect(isUserProfileTransfersTab('/@alice/permissions')).toBe(false);
  });
});

describe('isUserProfileWalletSection', () => {
  it('includes transfers and permissions', () => {
    expect(isUserProfilePermissionsTab('/@alice/permissions')).toBe(true);
    expect(isUserProfilePermissionsTab('/user-profile/alice/permissions')).toBe(true);
    expect(isUserProfileWalletSection('/@alice/transfers')).toBe(true);
    expect(isUserProfileWalletSection('/@alice/permissions')).toBe(true);
    expect(isUserProfileWalletSection('/user-profile/alice/permissions')).toBe(true);
    expect(isUserProfileWalletSection('/@alice/activity')).toBe(false);
  });
});
