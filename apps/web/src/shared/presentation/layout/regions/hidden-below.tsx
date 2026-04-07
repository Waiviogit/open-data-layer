import type { ReactNode } from 'react';

export type HiddenBelowBreakpoint = 'sm' | 'md' | 'lg' | 'xl';

export type HiddenBelowProps = {
  breakpoint: HiddenBelowBreakpoint;
  children: ReactNode;
  className?: string;
};

const BREAKPOINT_VISIBLE: Record<HiddenBelowBreakpoint, string> = {
  sm: 'hidden sm:block',
  md: 'hidden md:block',
  lg: 'hidden lg:block',
  xl: 'hidden xl:block',
};

/**
 * Hide children below a breakpoint; show from breakpoint up (CSS only, no JS).
 */
export function HiddenBelow({
  breakpoint,
  children,
  className = '',
}: HiddenBelowProps) {
  return (
    <div className={[BREAKPOINT_VISIBLE[breakpoint], className].join(' ')}>
      {children}
    </div>
  );
}
