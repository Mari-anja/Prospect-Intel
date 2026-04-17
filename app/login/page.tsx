import { LoginForm } from '@/components/LoginForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-400">Prospect Intel</div>
          <h1 className="mt-2 text-2xl font-semibold text-ink-900">Sign in</h1>
          <p className="mt-2 text-sm text-ink-500">Enter your email, we&apos;ll send a one-click link.</p>
        </div>
        {sp.error && (
          <div className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{sp.error}</div>
        )}
        <LoginForm next={sp.next ?? '/dashboard'} />
      </div>
    </main>
  );
}
