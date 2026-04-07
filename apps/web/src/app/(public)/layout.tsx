import { PublicShell } from '@/shared/presentation/layout';

export default function PublicRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicShell>{children}</PublicShell>;
}
