'use client';

import { useMemo, useState } from 'react';
import type { ProspectWithOutreach } from '@/lib/prospects';
import type { OutreachStatus } from '@/lib/types';
import { StatusPill } from './StatusPill';
import { ProspectDrawer } from './ProspectDrawer';

const STATUS_FILTERS: (OutreachStatus | 'all')[] = [
  'all', 'pending', 'drafted', 'contacted', 'sent', 'replied', 'followup_due', 'dead',
];

export function ProspectTable({ rows }: { rows: ProspectWithOutreach[] }) {
  const [q, setQ] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [company, setCompany] = useState<string>('__all__');
  const [status, setStatus] = useState<OutreachStatus | 'all'>('all');
  const [onePerFund, setOnePerFund] = useState(false);
  const [openRow, setOpenRow] = useState<ProspectWithOutreach | null>(null);

  const companies = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.company) set.add(r.company);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const lower = q.trim().toLowerCase();
    const base = rows.filter(r => {
      if (r.score < minScore) return false;
      const curStatus = r.outreach?.status ?? 'pending';
      if (status !== 'all' && curStatus !== status) return false;
      if (company !== '__all__' && r.company !== company) return false;
      if (lower) {
        const hay = `${r.name} ${r.title} ${r.company} ${r.why}`.toLowerCase();
        if (!hay.includes(lower)) return false;
      }
      return true;
    });
    if (!onePerFund) return base;

    // Keep only the highest-scored prospect per company (normalized).
    // Ties broken by most-recently-created.
    const bestByFund = new Map<string, ProspectWithOutreach>();
    for (const r of base) {
      const key = (r.company || r.name).trim().toLowerCase().replace(/\s+/g, ' ');
      const prev = bestByFund.get(key);
      if (!prev || r.score > prev.score) {
        bestByFund.set(key, r);
      }
    }
    return Array.from(bestByFund.values()).sort((a, b) => b.score - a.score);
  }, [rows, q, minScore, company, status, onePerFund]);

  return (
    <div className="mt-2">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="search name, title, company, why…"
          className="min-w-[260px] flex-1 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm placeholder:text-ink-400 focus:border-ink-400 focus:outline-none"
        />
        <select
          value={company}
          onChange={e => setCompany(e.target.value)}
          className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-ink-400 focus:outline-none"
        >
          <option value="__all__">all companies ({companies.length})</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-ink-500">
          min score
          <input
            type="range" min={0} max={10} value={minScore}
            onChange={e => setMinScore(Number(e.target.value))}
            className="accent-ink-900"
          />
          <span className="w-5 text-right font-mono tabular-nums text-ink-700">{minScore}</span>
        </label>
        <select
          value={status}
          onChange={e => setStatus(e.target.value as OutreachStatus | 'all')}
          className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-ink-400 focus:outline-none"
        >
          {STATUS_FILTERS.map(s => <option key={s} value={s}>{s === 'all' ? 'any status' : s.replace('_', ' ')}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-ink-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onePerFund}
            onChange={e => setOnePerFund(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-ink-300 text-ink-900 focus:ring-0 focus:ring-offset-0"
          />
          one per fund
        </label>
        <div className="ml-auto text-xs text-ink-500">{filtered.length} / {rows.length}</div>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-16">Score</th>
                <th className="px-4 py-3 text-left font-medium">Name · Title</th>
                <th className="px-4 py-3 text-left font-medium">Company</th>
                <th className="px-4 py-3 text-left font-medium">Why</th>
                <th className="px-4 py-3 text-left font-medium w-36">Status</th>
                <th className="px-4 py-3 text-left font-medium w-16">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map(r => (
                <tr
                  key={r.id}
                  onClick={() => setOpenRow(r)}
                  className="cursor-pointer hover:bg-ink-50/60"
                >
                  <td className="px-4 py-3 align-top">
                    <ScoreBadge score={r.score} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-ink-900">{r.name}</div>
                    <div className="text-xs text-ink-500">{r.title}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-ink-700">{r.company}</td>
                  <td className="px-4 py-3 align-top text-xs text-ink-600 max-w-md">{r.why}</td>
                  <td className="px-4 py-3 align-top" onClick={e => e.stopPropagation()}>
                    <StatusPill prospectId={r.id} initial={r.outreach?.status ?? 'pending'} />
                  </td>
                  <td className="px-4 py-3 align-top" onClick={e => e.stopPropagation()}>
                    {r.linkedin ? (
                      <a href={r.linkedin} target="_blank" rel="noreferrer noopener" className="text-xs font-medium text-accent hover:underline">
                        open ↗
                      </a>
                    ) : <span className="text-xs text-ink-300">—</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-400">
                    no rows match these filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProspectDrawer row={openRow} onClose={() => setOpenRow(null)} />
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 9 ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' :
    score >= 7 ? 'bg-amber-100 text-amber-800 ring-amber-200' :
    score >= 5 ? 'bg-ink-100 text-ink-700 ring-ink-200' :
    'bg-rose-100 text-rose-700 ring-rose-200';
  return (
    <span className={'inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-mono font-semibold ring-1 ring-inset tabular-nums ' + tone}>
      {score}
    </span>
  );
}
