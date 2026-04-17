import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { getProspect } from '@/lib/prospects';
import { getKey } from '@/lib/keyStore';
import { apolloMatch } from '@/lib/apollo';
import { setEmail } from '@/lib/outreachStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const apiKey = await getKey(user.id, 'apollo');
    if (!apiKey) return NextResponse.json({ ok: false, error: 'Apollo API key not configured. Add it in Settings.' }, { status: 400 });

    const prospect = await getProspect(user.id, id);
    if (!prospect) return NextResponse.json({ ok: false, error: 'prospect not found' }, { status: 404 });

    const hit = await apolloMatch({
      apiKey,
      name: prospect.name,
      organizationName: prospect.company,
      linkedinUrl: prospect.linkedin,
    });

    if (!hit?.email) {
      return NextResponse.json({ ok: false, error: 'no email found for this prospect' }, { status: 404 });
    }

    const state = await setEmail(user.id, id, hit.email, 'apollo');
    return NextResponse.json({ ok: true, email: hit.email, emailStatus: hit.emailStatus, state });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'UNAUTHENTICATED') return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
    return NextResponse.json({ ok: false, error: e?.message ?? String(err) }, { status: 500 });
  }
}
