'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { LoginDialog } from './login-dialog';

export type LoginModalContextValue = {
  openLogin: () => void;
};

const LoginModalContext = createContext<LoginModalContextValue | null>(null);

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openLogin = useCallback(() => {
    setOpen(true);
  }, []);

  const value = useMemo<LoginModalContextValue>(
    () => ({
      openLogin,
    }),
    [openLogin],
  );

  return (
    <LoginModalContext.Provider value={value}>
      {children}
      <LoginDialog open={open} onClose={() => setOpen(false)} />
    </LoginModalContext.Provider>
  );
}

export function useLoginModal(): LoginModalContextValue {
  const ctx = useContext(LoginModalContext);
  if (!ctx) {
    throw new Error('useLoginModal must be used within LoginModalProvider');
  }
  return ctx;
}
