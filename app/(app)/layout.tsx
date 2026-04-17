import { requireUser } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell userEmail={user.email ?? ''}>{children}</AppShell>;
}
