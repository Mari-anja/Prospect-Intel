import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { getProspect } from '@/lib/prospects';
import { getCampaign } from '@/lib/campaigns';
import { getKey } from '@/lib/keyStore';
import { draftMessage } from '@/lib/drafter';
import { saveDraft } from '@/lib/outreachStore';
import type { Channel } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json();
    const channel = body.channel as Channel;
    if (channel !== 'linkedin' && channel !== 'email') {
      return NextResponse.json({ ok: false, error: 'channel must be linkedin or email' }, { status: 400 });
    }

    const prospect = await getProspect(user.id, id);
    if (!prospect) return NextResponse.json({ ok: false, error: 'prospect not found' }, { status: 404 });

    const campaign = await getCampaign(user.id, prospect.campaignId);
    if (!campaign) return NextResponse.json({ ok: false, error: 'campaign not found' }, { status: 404 });

    const apiKey = await getKey(user.id, 'anthropic');
    if (!apiKey) return NextResponse.json({ ok: false, error: 'Anthropic API key not configured' }, { status: 400 });

    const draft = await draftMessage({
      channel,
      briefMd: campaign.briefMd,
      voiceRules: campaign.voiceRules,
      apiKey,
      recipient: {
        name: prospect.name,
        title: prospect.title,
        company: prospect.company,
        why: prospect.why,
      },
    });

    const state = await saveDraft(user.id, id, draft);
    return NextResponse.json({ ok: true, draft, state });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'UNAUTHENTICATED') return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
    return NextResponse.json({ ok: false, error: e?.message ?? String(err) }, { status: 500 });
  }
}
