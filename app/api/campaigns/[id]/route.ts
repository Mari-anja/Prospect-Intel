import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { getCampaign, updateCampaign, deleteCampaign } from '@/lib/campaigns';
import type { IcpConfig, PriorityTarget } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const campaign = await getCampaign(user.id, id);
    if (!campaign) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true, campaign });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json();

    const patch: Partial<{
      name: string;
      briefMd: string;
      voiceRules: string;
      icpConfig: IcpConfig;
      priorityTargets: PriorityTarget[];
    }> = {};
    if (typeof body.name === 'string') patch.name = body.name.trim();
    if (typeof body.briefMd === 'string') patch.briefMd = body.briefMd;
    if (typeof body.voiceRules === 'string') patch.voiceRules = body.voiceRules;
    if (body.icpConfig && typeof body.icpConfig === 'object') patch.icpConfig = body.icpConfig;
    if (Array.isArray(body.priorityTargets)) patch.priorityTargets = body.priorityTargets;

    const row = await updateCampaign(user.id, id, patch);
    if (!row) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true, campaign: row });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await deleteCampaign(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  const e = err as { code?: string; message?: string };
  if (e?.code === 'UNAUTHENTICATED') return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  return NextResponse.json({ ok: false, error: e?.message ?? String(err) }, { status: 500 });
}
