import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/supabase/server';
import { getCampaign } from '@/lib/campaigns';
import { getKeyStatuses } from '@/lib/keyStore';
import { CampaignEditor } from '@/components/CampaignEditor';
import { KeyStatusBanner } from '@/components/KeyStatusBanner';
import type { IcpConfig, PriorityTarget } from '@/lib/types';
import { DEFAULT_ICP } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [campaign, keyStatus] = await Promise.all([
    getCampaign(user.id, id),
    getKeyStatuses(user.id),
  ]);
  if (!campaign) notFound();

  const icp = (campaign.icpConfig as IcpConfig) ?? DEFAULT_ICP;
  const targets = (campaign.priorityTargets as PriorityTarget[]) ?? [];

  return (
    <div>
      <header className="border-b border-ink-200 bg-white px-8 pt-8 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-400">{campaign.kind} campaign</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">{campaign.name}</h1>
            <p className="mt-1 text-sm text-ink-500">
              Edit the brief, ICP, and target list. Save, then run the search.
            </p>
          </div>
        </div>
      </header>

      <div className="px-8 py-6 space-y-6">
        <KeyStatusBanner keyStatus={keyStatus} />
        <CampaignEditor
          campaignId={campaign.id}
          initial={{
            name: campaign.name,
            briefMd: campaign.briefMd,
            voiceRules: campaign.voiceRules,
            icp,
            targets,
          }}
        />
      </div>
    </div>
  );
}
