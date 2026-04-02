'use client';

import { createContext, useContext } from 'react';

export type UserProfileNavContextValue = {
  pathname: string;
  search: string;
};

export const UserProfileNavContext = createContext<UserProfileNavContextValue>({
  pathname: '',
  search: '',
});

export function useUserProfileNav(): UserProfileNavContextValue {
  return useContext(UserProfileNavContext);
}
