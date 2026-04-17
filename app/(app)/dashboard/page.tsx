import Link from 'next/link';
import { requireUser } from '@/lib/supabase/server';
import { listCampaigns } from '@/lib/campaigns';
import { getKeyStatuses } from '@/lib/keyStore';
import { CreateCampaignButton } from '@/components/CreateCampaignButton';
import { KeyStatusBanner } from '@/components/KeyStatusBanner';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const user = await requireUser();
  const [campaigns, keyStatus] = await Promise.all([
    listCampaigns(user.id),
    getKeyStatuses(user.id),
  ]);

  const needsKeys = !keyStatus.serper || !keyStatus.anthropic;

  return (
    <div>
      <header className="border-b border-ink-200 bg-white px-8 pt-8 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Campaigns</h1>
            <p className="mt-1 text-sm text-ink-500">
              Each campaign has its own brief, ICP, and prospect list. Start with one.
            </p>
          </div>
          <CreateCampaignButton />
        </div>
      </header>

      {needsKeys && (
        <div className="px-8 pt-6">
          <KeyStatusBanner keyStatus={keyStatus} />
        </div>
      )}

      <div className="px-8 py-6">
        {campaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-ink-900">No campaigns yet</h2>
            <p className="mt-2 text-sm text-ink-500">
              A campaign pairs a Sales Brief with an ICP. Create your first one above.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.map(c => (
              <li key={c.id}>
                <Link
                  href={`/campaigns/${c.id}`}
                  className="block rounded-xl border border-ink-200 bg-white p-5 transition hover:border-ink-400"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate text-base font-semibold text-ink-900">{c.name}</h3>
                    <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-500">
                      {c.kind}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-ink-500">
                    {c.prospectCount} prospect{c.prospectCount === 1 ? '' : 's'} · updated {new Date(c.updatedAt).toLocaleDateString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
