'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateCampaignButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'client' | 'investor' | 'custom'>('client');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), kind }),
      });
      const data = await res.json();
      if (!data.ok) { setErr(data.error ?? 'failed'); return; }
      setOpen(false);
      setName('');
      router.push(`/campaigns/${data.campaign.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700"
      >
        New campaign
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="fixed left-1/2 top-24 z-50 w-full max-w-sm -translate-x-1/2 rounded-xl border border-ink-200 bg-white p-6 shadow-2xl">
        <h2 className="text-base font-semibold text-ink-900">New campaign</h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-500">Name</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              placeholder="e.g. Furniture brand clients"
              className="mt-1 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-ink-400 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-500">Kind</span>
            <select
              value={kind}
              onChange={e => setKind(e.target.value as typeof kind)}
              className="mt-1 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-ink-400 focus:outline-none"
            >
              <option value="client">Clients (brands, buyers)</option>
              <option value="investor">Investors</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {err && <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="rounded-md bg-ink-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-ink-700 disabled:opacity-60"
            >
              {busy ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
