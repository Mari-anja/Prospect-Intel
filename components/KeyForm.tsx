'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Provider } from '@/lib/types';

export function KeyForm({ provider, label, description, placeholder, configured, required }: {
  provider: Provider;
  label: string;
  description: string;
  placeholder: string;
  configured: boolean;
  required?: boolean;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy('save');
    setErr(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/keys/${provider}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: value.trim() }),
      });
      const data = await res.json();
      if (!data.ok) { setErr(data.error ?? 'failed'); return; }
      setValue('');
      setSaved(true);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy('delete');
    setErr(null);
    try {
      const res = await fetch(`/api/keys/${provider}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.ok) { setErr(data.error ?? 'failed'); return; }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-xl border border-ink-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink-900">
            {label}{required && <span className="ml-1 text-rose-600">*</span>}
          </h3>
          <p className="mt-1 text-xs text-ink-500 max-w-md">{description}</p>
        </div>
        <StatusBadge configured={configured} />
      </div>

      <form onSubmit={save} className="mt-4 flex items-center gap-2">
        <input
          type="password"
          autoComplete="off"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={configured ? 'Enter new key to replace…' : placeholder}
          className="flex-1 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-mono placeholder:font-sans placeholder:text-ink-400 focus:border-ink-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy !== null || !value.trim()}
          className="rounded-md bg-ink-900 px-4 py-2 text-xs font-medium text-white hover:bg-ink-700 disabled:opacity-60"
        >
          {busy === 'save' ? 'Saving…' : configured ? 'Replace' : 'Save'}
        </button>
        {configured && (
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-xs font-medium text-ink-700 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
          >
            {busy === 'delete' ? 'Removing…' : 'Remove'}
          </button>
        )}
      </form>

      {saved && <p className="mt-2 text-xs text-emerald-700">Saved. Key stored encrypted.</p>}
      {err && <p className="mt-2 text-xs text-rose-700">{err}</p>}
    </section>
  );
}

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <span className={
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ' +
      (configured
        ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
        : 'bg-ink-100 text-ink-600 ring-ink-200')
    }>
      <span className={'h-1.5 w-1.5 rounded-full ' + (configured ? 'bg-emerald-600' : 'bg-ink-400')} />
      {configured ? 'configured' : 'not set'}
    </span>
  );
}
