import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { saveKey, deleteKey } from '@/lib/keyStore';
import type { Provider } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED: Provider[] = ['serper', 'anthropic', 'apollo'];

function parseProvider(raw: string | undefined): Provider | null {
  if (!raw) return null;
  return ALLOWED.includes(raw as Provider) ? (raw as Provider) : null;
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  try {
    const user = await requireUser();
    const { provider: raw } = await ctx.params;
    const provider = parseProvider(raw);
    if (!provider) return NextResponse.json({ ok: false, error: 'unknown provider' }, { status: 400 });

    const body = await req.json();
    const value = String(body.value ?? '').trim();
    if (!value) return NextResponse.json({ ok: false, error: 'value required' }, { status: 400 });
    if (value.length < 8) return NextResponse.json({ ok: false, error: 'value looks too short' }, { status: 400 });

    await saveKey(user.id, provider, value);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  try {
    const user = await requireUser();
    const { provider: raw } = await ctx.params;
    const provider = parseProvider(raw);
    if (!provider) return NextResponse.json({ ok: false, error: 'unknown provider' }, { status: 400 });
    await deleteKey(user.id, provider);
    return NextResponse.json({ ok: true });
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
