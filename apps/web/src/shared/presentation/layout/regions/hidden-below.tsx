import type { ReactNode } from 'react';

export type HiddenBelowBreakpoint = 'sm' | 'md' | 'lg' | 'xl';

export type HiddenBelowProps = {
  breakpoint: HiddenBelowBreakpoint;
  children: ReactNode;
  className?: string;
};

export const hiddenBelowClassForBreakpoint: Record<
  HiddenBelowBreakpoint,
  string
> = {
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
    <div
      className={[hiddenBelowClassForBreakpoint[breakpoint], className].join(
        ' ',
      )}
    >
      {children}
    </div>
  );
}
