'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { IcpConfig, PriorityTarget } from '@/lib/types';

interface Props {
  campaignId: string;
  initial: {
    name: string;
    briefMd: string;
    voiceRules: string;
    icp: IcpConfig;
    targets: PriorityTarget[];
  };
}

type Tab = 'brief' | 'icp' | 'targets' | 'voice';

export function CampaignEditor({ campaignId, initial }: Props) {
  const [tab, setTab] = useState<Tab>('brief');
  const [name, setName] = useState(initial.name);
  const [briefMd, setBriefMd] = useState(initial.briefMd);
  const [voiceRules, setVoiceRules] = useState(initial.voiceRules);
  const [icpJson, setIcpJson] = useState(JSON.stringify(initial.icp, null, 2));
  const [targetsText, setTargetsText] = useState(
    initial.targets.map(t => (t.notes ? `${t.name} — ${t.notes}` : t.name)).join('\n'),
  );
  const [busy, setBusy] = useState<'save' | 'run' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  function parseTargets(text: string): PriorityTarget[] {
    return text.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [name, ...rest] = line.split(/\s+[—-]\s+/);
        return { name: name.trim(), notes: rest.join(' ').trim() || undefined };
      });
  }

  async function save() {
    setBusy('save');
    setErr(null);
    setSaved(false);
    try {
      let icp: IcpConfig;
      try { icp = JSON.parse(icpJson); } catch { throw new Error('ICP config is not valid JSON'); }
      const targets = parseTargets(targetsText);

      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, briefMd, voiceRules, icpConfig: icp, priorityTargets: targets }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'save failed');
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function runSearch() {
    setBusy('run');
    setErr(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/run`, { method: 'POST' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'run failed');
      router.push(`/campaigns/${campaignId}/prospects`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const tabs: { id: Tab; label: string; hint: string }[] = [
    { id: 'brief',   label: 'Brief',   hint: 'sales intelligence' },
    { id: 'icp',     label: 'ICP',     hint: 'scoring rules' },
    { id: 'targets', label: 'Targets', hint: 'priority companies' },
    { id: 'voice',   label: 'Voice',   hint: 'outreach tone' },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-ink-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ' +
              (tab === t.id
                ? 'border-ink-900 text-ink-900'
                : 'border-transparent text-ink-500 hover:text-ink-700')
            }
          >
            {t.label}
            <span className="ml-2 text-[10px] uppercase tracking-wider text-ink-400">{t.hint}</span>
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="mt-6">
        {tab === 'brief' && (
          <div className="space-y-4">
            <Field label="Name">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-ink-400 focus:outline-none"
              />
            </Field>
            <Field label="Sales Intelligence Brief (Markdown)" hint="This is the source of truth for scoring + outreach. Paste your brief here.">
              <textarea
                value={briefMd}
                onChange={e => setBriefMd(e.target.value)}
                rows={24}
                placeholder="# Your Sales Intelligence Brief&#10;&#10;## 1. Company snapshot&#10;..."
                className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed focus:border-ink-400 focus:outline-none"
              />
            </Field>
          </div>
        )}

        {tab === 'icp' && (
          <Field label="ICP config (JSON)" hint="Edit title weights, company categories, signal bonus, scoring caps.">
            <textarea
              value={icpJson}
              onChange={e => setIcpJson(e.target.value)}
              rows={28}
              spellCheck={false}
              className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 font-mono text-xs focus:border-ink-400 focus:outline-none"
            />
          </Field>
        )}

        {tab === 'targets' && (
          <Field label="Priority targets" hint="One per line. Optional notes after an em dash. e.g. Flexform — 500+ SKU catalog, Salone exhibitor">
            <textarea
              value={targetsText}
              onChange={e => setTargetsText(e.target.value)}
              rows={24}
              placeholder={'Flexform\nBoffi\nMinotti'}
              className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 font-mono text-xs focus:border-ink-400 focus:outline-none"
            />
          </Field>
        )}

        {tab === 'voice' && (
          <Field label="Voice rules" hint="Extra do/don't rules for outreach messages. Inherited baseline already bans buzzwords, em-dashes, bullet lists, competitor mentions, etc.">
            <textarea
              value={voiceRules}
              onChange={e => setVoiceRules(e.target.value)}
              rows={20}
              placeholder="- Use the anchor phrase &quot;30 seconds&quot;&#10;- Never mention pricing in first message&#10;- Sign off with first name only"
              className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-ink-400 focus:outline-none"
            />
          </Field>
        )}
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-ink-200 pt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={busy !== null}
            className="rounded-md bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700 disabled:opacity-60"
          >
            {busy === 'save' ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={runSearch}
            disabled={busy !== null}
            className="rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50 disabled:opacity-60"
          >
            {busy === 'run' ? 'Running search…' : 'Run search'}
          </button>
          <Link href={`/campaigns/${campaignId}/prospects`} className="text-sm text-ink-600 hover:text-ink-900 hover:underline">
            View prospects →
          </Link>
        </div>
        {saved && <span className="text-xs text-emerald-700">Saved.</span>}
        {err && <span className="text-xs text-rose-700">{err}</span>}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-ink-500">{label}</span>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      <div className="mt-2">{children}</div>
    </label>
  );
}
