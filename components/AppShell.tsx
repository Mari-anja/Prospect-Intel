import Link from 'next/link';
import { AppNav } from './AppNav';
import { UserMenu } from './UserMenu';

interface Props {
  userEmail: string;
  children: React.ReactNode;
}

export function AppShell({ userEmail, children }: Props) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-ink-200 bg-white flex flex-col sticky top-0 h-screen">
        <div className="px-6 pt-6 pb-8">
          <Link href="/dashboard" className="block">
            <div className="text-xs uppercase tracking-[0.18em] text-ink-400">Prospect</div>
            <div className="text-base font-semibold tracking-tight text-ink-900">Intel</div>
          </Link>
        </div>
        <AppNav />
        <UserMenu email={userEmail} />
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
