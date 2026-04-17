import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/supabase/server';
import { getCampaign } from '@/lib/campaigns';
import { listProspects } from '@/lib/prospects';
import { ProspectTable } from '@/components/ProspectTable';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProspectsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [campaign, rows] = await Promise.all([
    getCampaign(user.id, id),
    listProspects(user.id, id),
  ]);
  if (!campaign) notFound();

  const byStatus = {
    pending:      rows.filter(r => r.outreach?.status === 'pending').length,
    drafted:      rows.filter(r => r.outreach?.status === 'drafted').length,
    contacted:    rows.filter(r => r.outreach?.status === 'contacted').length,
    sent:         rows.filter(r => r.outreach?.status === 'sent').length,
    replied:      rows.filter(r => r.outreach?.status === 'replied').length,
    followup_due: rows.filter(r => r.outreach?.status === 'followup_due').length,
    dead:         rows.filter(r => r.outreach?.status === 'dead').length,
  };

  return (
    <div>
      <header className="border-b border-ink-200 bg-white px-8 pt-8 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-400">
              <Link href={`/campaigns/${id}`} className="hover:text-ink-700">← {campaign.name}</Link>
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">Prospects</h1>
            <p className="mt-1 text-sm text-ink-500">
              {rows.length} kept. Click a row to open the outreach drawer.
            </p>
          </div>
          <Link
            href={`/campaigns/${id}`}
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50"
          >
            Edit campaign
          </Link>
        </div>
        <dl className="mt-6 grid grid-cols-7 gap-4 max-w-4xl">
          <Stat label="total" value={rows.length} />
          <Stat label="pending" value={byStatus.pending} tone="ink" />
          <Stat label="drafted" value={byStatus.drafted} tone="sky" />
          <Stat label="contacted" value={byStatus.contacted} tone="amber" />
          <Stat label="sent" value={byStatus.sent} tone="violet" />
          <Stat label="replied" value={byStatus.replied} tone="green" />
          <Stat label="dead" value={byStatus.dead} tone="red" />
        </dl>
      </header>

      <div className="px-8 py-6">
        {rows.length === 0 ? (
          <EmptyState campaignId={id} />
        ) : (
          <ProspectTable rows={rows} />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'ink' }: { label: string; value: number; tone?: 'ink' | 'sky' | 'amber' | 'violet' | 'green' | 'red' }) {
  const color = {
    ink:    'text-ink-900',
    sky:    'text-sky-700',
    amber:  'text-amber-700',
    violet: 'text-violet-700',
    green:  'text-emerald-700',
    red:    'text-rose-700',
  }[tone];
  return (
    <div>
      <dd className={'text-2xl font-semibold tabular-nums ' + color}>{value}</dd>
      <dt className="mt-0.5 text-xs uppercase tracking-wider text-ink-400">{label}</dt>
    </div>
  );
}

function EmptyState({ campaignId }: { campaignId: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-200 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold text-ink-900">No prospects yet</h2>
      <p className="mt-2 max-w-md mx-auto text-sm text-ink-500">
        Head back to the campaign, make sure you&apos;ve added priority targets and set up your ICP, then click <span className="font-medium text-ink-700">Run search</span>.
      </p>
      <Link
        href={`/campaigns/${campaignId}`}
        className="mt-4 inline-flex items-center justify-center rounded-md bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700"
      >
        Back to campaign
      </Link>
    </div>
  );
}
