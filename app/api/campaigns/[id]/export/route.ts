// Streams the campaign's prospects + outreach state as a CSV download.
// Auth-gated to the campaign owner via requireUser().

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { getCampaign } from '@/lib/campaigns';
import { listProspects } from '@/lib/prospects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escCsv(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function safeFileName(s: string): string {
  return s.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const campaign = await getCampaign(user.id, id);
    if (!campaign) return NextResponse.json({ ok: false, error: 'campaign not found' }, { status: 404 });

    const rows = await listProspects(user.id, id);

    const headers = [
      'name', 'title', 'company', 'linkedin', 'email', 'score',
      'why', 'status', 'note', 'followup_due', 'last_updated',
    ];

    const lines: string[] = [headers.join(',')];
    for (const r of rows) {
      lines.push([
        r.name,
        r.title,
        r.company,
        r.linkedin,
        r.email,
        r.score,
        r.why,
        r.outreach?.status ?? 'pending',
        r.outreach?.note ?? '',
        r.outreach?.followupDue ?? '',
        r.outreach?.updatedAt?.toISOString() ?? '',
      ].map(escCsv).join(','));
    }
    const csv = lines.join('\n') + '\n';

    const filename = `prospect-intel--${safeFileName(campaign.name)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'UNAUTHENTICATED') {
      return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: e?.message ?? String(err) }, { status: 500 });
  }
}
