'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type UserProfileSocialCounts = {
  followerCount: number;
  followingCount: number;
  followingObjectsCount: number;
};

const UserProfileSocialCountsContext =
  createContext<UserProfileSocialCounts | null>(null);

export function UserProfileSocialCountsProvider({
  value,
  children,
}: {
  value: UserProfileSocialCounts;
  children: ReactNode;
}) {
  return (
    <UserProfileSocialCountsContext.Provider value={value}>
      {children}
    </UserProfileSocialCountsContext.Provider>
  );
}

export function useUserProfileSocialCounts(): UserProfileSocialCounts | null {
  return useContext(UserProfileSocialCountsContext);
}
