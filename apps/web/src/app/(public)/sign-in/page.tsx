import type { Metadata } from 'next';

import { LoginWall } from '@/modules/auth/presentation/components/login-wall';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function SignInPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-lg rounded-card-lg border border-border bg-surface p-card-padding shadow-card-float">
        <h1 className="text-section font-display text-heading">Sign in required</h1>
        <p className="mt-2 text-body text-fg-secondary">
          To view this site, please sign in with your Hive account.
        </p>
        <LoginWall />
      </div>
    </div>
  );
}
