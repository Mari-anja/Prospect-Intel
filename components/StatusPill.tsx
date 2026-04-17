'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OutreachStatus } from '@/lib/types';

const OPTIONS: { value: OutreachStatus; label: string; classes: string }[] = [
  { value: 'pending',      label: 'Pending',   classes: 'bg-ink-100 text-ink-700 ring-ink-200' },
  { value: 'drafted',      label: 'Drafted',   classes: 'bg-sky-100 text-sky-800 ring-sky-200' },
  { value: 'contacted',    label: 'Contacted', classes: 'bg-amber-100 text-amber-800 ring-amber-200' },
  { value: 'sent',         label: 'Sent',      classes: 'bg-violet-100 text-violet-800 ring-violet-200' },
  { value: 'replied',      label: 'Replied',   classes: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  { value: 'followup_due', label: 'Follow-up', classes: 'bg-orange-100 text-orange-800 ring-orange-200' },
  { value: 'dead',         label: 'Dead',      classes: 'bg-rose-100 text-rose-800 ring-rose-200' },
];

export function StatusPill({ prospectId, initial }: { prospectId: string; initial: OutreachStatus }) {
  const [status, setStatus] = useState<OutreachStatus>(initial);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const cur = OPTIONS.find(o => o.value === status) ?? OPTIONS[0];

  async function onChange(next: OutreachStatus) {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) { setStatus(prev); return; }
      router.refresh();
    } catch {
      setStatus(prev);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative inline-block">
      <select
        value={status}
        onChange={e => onChange(e.target.value as OutreachStatus)}
        disabled={saving}
        className={
          'appearance-none rounded-full px-3 py-1 pr-6 text-xs font-medium ring-1 ring-inset focus:outline-none ' +
          cur.classes + (saving ? ' opacity-60' : '')
        }
      >
        {OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-current opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path d="M5.25 7.5 10 12.25 14.75 7.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
