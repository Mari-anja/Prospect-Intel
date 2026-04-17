import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { setStatus } from '@/lib/outreachStore';
import { getProspect } from '@/lib/prospects';
import type { OutreachStatus } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED: OutreachStatus[] = ['pending', 'drafted', 'contacted', 'sent', 'replied', 'followup_due', 'dead'];

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json();
    const status = body.status as OutreachStatus;
    if (!ALLOWED.includes(status)) {
      return NextResponse.json({ ok: false, error: `status must be one of ${ALLOWED.join(', ')}` }, { status: 400 });
    }
    // Ownership check
    const p = await getProspect(user.id, id);
    if (!p) return NextResponse.json({ ok: false, error: 'prospect not found' }, { status: 404 });

    const state = await setStatus(user.id, id, status);
    return NextResponse.json({ ok: true, state });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'UNAUTHENTICATED') return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
    return NextResponse.json({ ok: false, error: e?.message ?? String(err) }, { status: 500 });
  }
}
