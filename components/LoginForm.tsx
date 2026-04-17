'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: value,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });
      if (error) setErr(error.message);
      else setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="text-sm font-medium text-emerald-900">Check your email.</div>
        <p className="mt-1 text-sm text-emerald-800">
          We sent a sign-in link to <span className="font-mono">{email}</span>.
          Click it and you&apos;ll land on your dashboard.
        </p>
        <p className="mt-3 text-xs text-emerald-700">
          Didn&apos;t arrive? Check spam, or{' '}
          <button
            onClick={() => { setSent(false); setErr(null); }}
            className="font-medium underline hover:text-emerald-900"
          >
            try a different email
          </button>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-500">Email</span>
        <input
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="mt-1 w-full rounded-md border border-ink-200 bg-white px-3 py-2.5 text-sm focus:border-ink-400 focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !email.trim()}
        className="inline-flex w-full items-center justify-center rounded-md bg-ink-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-ink-700 disabled:opacity-60"
      >
        {busy ? 'Sending…' : 'Email me a sign-in link'}
      </button>
      {err && <p className="text-xs text-rose-700">{err}</p>}
      <p className="text-xs text-ink-400">
        We&apos;ll send a one-click link. No password. First time? We create your account automatically.
      </p>
    </form>
  );
}
