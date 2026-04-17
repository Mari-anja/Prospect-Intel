'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProspectWithOutreach } from '@/lib/prospects';
import type { Channel, MessageDraft, TimelineEvent } from '@/lib/types';

interface Props {
  row: ProspectWithOutreach | null;
  onClose: () => void;
}

export function ProspectDrawer({ row, onClose }: Props) {
  const router = useRouter();
  const [state, setState] = useState(row?.outreach ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setState(row?.outreach ?? null); setErr(null); }, [row]);

  useEffect(() => {
    if (!row) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [row, onClose]);

  const refresh = useCallback(() => router.refresh(), [router]);

  if (!row) return null;

  // Snapshot non-nullable values now that we've guarded row — closures below
  // lose TS narrowing otherwise.
  const prospectId = row.id;
  const prospectName = row.name;
  const prospectTitle = row.title;
  const prospectCompany = row.company;
  const prospectLinkedin = row.linkedin;
  const prospectWhy = row.why;

  const email = row.email ?? '';
  const drafts = (state?.drafts as { linkedin?: MessageDraft; email?: MessageDraft } | undefined) ?? {};
  const timeline = (state?.timeline as TimelineEvent[] | undefined) ?? [];

  async function call(path: string, body: Record<string, unknown>, busyLabel: string) {
    setBusy(busyLabel);
    setErr(null);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) { setErr(data.error ?? `HTTP ${res.status}`); return null; }
      if (data.state) setState(data.state);
      refresh();
      return data;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function onDraft(channel: Channel) {
    await call(`/api/prospects/${prospectId}/draft`, { channel }, `drafting ${channel}`);
  }
  async function onEnrich() {
    await call(`/api/prospects/${prospectId}/enrich`, {}, 'enriching');
  }
  async function onMarkSent(channel: Channel) {
    await call(`/api/prospects/${prospectId}/send`, { channel }, `marking ${channel} sent`);
  }
  async function onFollowup(iso: string | null) {
    await call(`/api/prospects/${prospectId}/followup`, { iso }, 'saving follow-up');
  }

  function openLinkedIn() {
    const body = drafts.linkedin?.body ?? '';
    if (body) navigator.clipboard?.writeText(body).catch(() => {});
    if (prospectLinkedin) window.open(prospectLinkedin, '_blank', 'noopener');
  }

  function openGmail() {
    const d = drafts.email;
    if (!d) return;
    const to = encodeURIComponent(email || '');
    const su = encodeURIComponent(d.subject ?? '');
    const bd = encodeURIComponent(d.body ?? '');
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${bd}`, '_blank', 'noopener');
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside role="dialog" className="fixed right-0 top-0 z-50 h-screen w-full max-w-xl overflow-y-auto border-l border-ink-200 bg-white shadow-2xl">
        <header className="sticky top-0 z-10 border-b border-ink-200 bg-white/95 backdrop-blur px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-ink-900">{row.name}</h2>
              <p className="truncate text-xs text-ink-500">{row.title} · {row.company}</p>
            </div>
            <button onClick={onClose} className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900" aria-label="close">
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor"><path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L8.94 10l-4.72 4.72a.75.75 0 1 0 1.06 1.06L10 11.06l4.72 4.72a.75.75 0 0 0 1.06-1.06L11.06 10l4.72-4.72a.75.75 0 0 0-1.06-1.06L10 8.94 5.28 4.22Z"/></svg>
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {row.linkedin && (
              <a href={row.linkedin} target="_blank" rel="noreferrer noopener" className="rounded-full bg-ink-100 px-2.5 py-1 font-medium text-ink-700 hover:bg-ink-200">LinkedIn ↗</a>
            )}
            {email ? (
              <a href={`mailto:${email}`} className="rounded-full bg-ink-100 px-2.5 py-1 font-mono text-[11px] text-ink-700 hover:bg-ink-200">{email}</a>
            ) : (
              <button onClick={onEnrich} disabled={busy !== null} className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60">
                {busy === 'enriching' ? 'enriching…' : 'enrich via Apollo'}
              </button>
            )}
          </div>
          {err && <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>}
        </header>

        <div className="px-6 py-5 space-y-8">
          <Section title="Why">
            <p className="text-sm leading-relaxed text-ink-700">{row.why}</p>
          </Section>

          <ChannelBlock
            title="LinkedIn"
            draft={drafts.linkedin}
            busy={busy}
            onDraft={() => onDraft('linkedin')}
            primaryAction={{
              label: drafts.linkedin ? 'Copy + open LinkedIn' : 'Open LinkedIn',
              onClick: openLinkedIn,
            }}
            onMarkSent={() => onMarkSent('linkedin')}
          />

          <ChannelBlock
            title="Email"
            draft={drafts.email}
            busy={busy}
            onDraft={() => onDraft('email')}
            primaryAction={drafts.email ? {
              label: email ? 'Open Gmail compose' : 'Copy body (no email yet)',
              onClick: email ? openGmail : () => navigator.clipboard?.writeText(drafts.email?.body ?? ''),
            } : undefined}
            onMarkSent={() => onMarkSent('email')}
            hint={!email ? 'Run "enrich via Apollo" above to populate the To: line.' : undefined}
          />

          <FollowupBlock value={state?.followupDue ?? undefined} onChange={onFollowup} busy={busy} />

          <Timeline events={timeline} />
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-400">{title}</h3>
      {children}
    </div>
  );
}

function ChannelBlock({
  title, draft, busy, onDraft, primaryAction, onMarkSent, hint,
}: {
  title: string;
  draft: MessageDraft | undefined;
  busy: string | null;
  onDraft: () => void;
  primaryAction?: { label: string; onClick: () => void };
  onMarkSent: () => void;
  hint?: string;
}) {
  const drafting = busy === `drafting ${title.toLowerCase()}`;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-ink-400">{title}</h3>
        <button
          onClick={onDraft}
          disabled={drafting}
          className="rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
        >
          {drafting ? 'drafting…' : draft ? 'redraft' : 'draft with Claude'}
        </button>
      </div>
      {draft ? (
        <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-3 text-sm text-ink-800">
          {draft.subject && <div className="mb-2 font-medium text-ink-900">{draft.subject}</div>}
          <div className="whitespace-pre-wrap leading-relaxed">{draft.body}</div>
          <div className="mt-2 text-[10px] uppercase tracking-wider text-ink-400">
            {new Date(draft.generatedAt).toLocaleString()} · {draft.model}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-ink-200 px-3 py-6 text-center text-xs text-ink-400">
          no draft yet — click &ldquo;draft with Claude&rdquo;
        </div>
      )}
      {hint && <p className="mt-2 text-xs text-ink-500">{hint}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {primaryAction && (
          <button onClick={primaryAction.onClick} className="rounded-md bg-ink-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-ink-700">
            {primaryAction.label}
          </button>
        )}
        <button onClick={onMarkSent} disabled={busy !== null} className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60">
          mark sent
        </button>
      </div>
    </div>
  );
}

function FollowupBlock({ value, onChange, busy }: { value?: string; onChange: (iso: string | null) => void; busy: string | null }) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => setLocal(value ?? ''), [value]);
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-400">Follow-up date</h3>
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={local} onChange={e => setLocal(e.target.value)} className="rounded-md border border-ink-200 bg-white px-2 py-1 text-sm focus:border-ink-400 focus:outline-none" />
        <button onClick={() => onChange(local || null)} disabled={busy !== null} className="rounded-md border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60">save</button>
        {value && <button onClick={() => { setLocal(''); onChange(null); }} disabled={busy !== null} className="text-xs text-ink-500 hover:text-ink-700">clear</button>}
        {value && <span className="text-xs text-ink-500">due {value}</span>}
      </div>
    </div>
  );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return (
      <div>
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-400">Timeline</h3>
        <p className="text-xs text-ink-400">nothing logged yet</p>
      </div>
    );
  }
  const sorted = [...events].reverse();
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-ink-400">Timeline</h3>
      <ol className="relative border-l border-ink-200 pl-4">
        {sorted.map((e, i) => (
          <li key={i} className="mb-4 last:mb-0">
            <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white bg-ink-300" />
            <div className="text-sm text-ink-800">{e.summary}</div>
            <div className="text-[11px] text-ink-400">{new Date(e.at).toLocaleString()} · {e.kind}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
