import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { createCampaign, listCampaigns } from '@/lib/campaigns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireUser();
    const campaigns = await listCampaigns(user.id);
    return NextResponse.json({ ok: true, campaigns });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const kind = body.kind;
    if (!name) return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });
    if (!['client', 'investor', 'custom'].includes(kind)) {
      return NextResponse.json({ ok: false, error: 'kind must be client, investor, or custom' }, { status: 400 });
    }
    const campaign = await createCampaign(user.id, { name, kind });
    return NextResponse.json({ ok: true, campaign });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  const e = err as { code?: string; message?: string };
  if (e?.code === 'UNAUTHENTICATED') {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }
  return NextResponse.json({ ok: false, error: e?.message ?? String(err) }, { status: 500 });
}
