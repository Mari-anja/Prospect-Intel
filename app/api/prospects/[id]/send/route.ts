import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { getProspect } from '@/lib/prospects';
import { markSent } from '@/lib/outreachStore';
import type { Channel } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const state = await markSent(user.id, id, channel);
    return NextResponse.json({ ok: true, state });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'UNAUTHENTICATED') return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
    return NextResponse.json({ ok: false, error: e?.message ?? String(err) }, { status: 500 });
  }
}
