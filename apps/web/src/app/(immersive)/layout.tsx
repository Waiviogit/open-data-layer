import { ImmersiveShell } from '@/shared/presentation/layout';

export default function ImmersiveRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ImmersiveShell>{children}</ImmersiveShell>;
}
