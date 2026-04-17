// Kicks off a prospect search for a campaign using the user's BYO keys.
// Synchronous for V0 — returns when the whole run is complete. For 22 targets
// that's ~2 minutes. We'll switch to a background job + SSE progress stream
// when we outgrow this.

import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireUser } from '@/lib/supabase/server';
import { getCampaign } from '@/lib/campaigns';
import { getKey } from '@/lib/keyStore';
import { getDb, schema } from '@/lib/db';
import { runCampaignSearch } from '@/lib/search/run';
import type { IcpConfig, PriorityTarget } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min, for the long-running search

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const campaign = await getCampaign(user.id, id);
    if (!campaign) return NextResponse.json({ ok: false, error: 'campaign not found' }, { status: 404 });

    const [serperKey, anthropicKey] = await Promise.all([
      getKey(user.id, 'serper'),
      getKey(user.id, 'anthropic'),
    ]);
    if (!serperKey) return NextResponse.json({ ok: false, error: 'Serper API key not configured. Add it in Settings.' }, { status: 400 });
    if (!anthropicKey) return NextResponse.json({ ok: false, error: 'Anthropic API key not configured. Add it in Settings.' }, { status: 400 });

    const icp = (campaign.icpConfig as IcpConfig);
    const targets = (campaign.priorityTargets as PriorityTarget[]) ?? [];
    if (!targets.length) {
      return NextResponse.json({ ok: false, error: 'No priority targets. Add some in the Targets tab.' }, { status: 400 });
    }

    const db = getDb();

    // Create a run row.
    const [runRow] = await db.insert(schema.runs).values({
      userId: user.id,
      campaignId: id,
      status: 'running',
      adapter: 'serper',
    }).returning();

    const logLines: string[] = [];
    const { prospects, errors } = await runCampaignSearch({
      serperKey,
      anthropicKey,
      icp,
      targets,
      kind: (campaign.kind as 'client' | 'investor' | 'custom') ?? 'custom',
      onProgress: msg => logLines.push(
        `[${msg.target}] raw=${msg.raw} kept=${msg.kept}${msg.error ? ` error=${msg.error}` : ''}`
      ),
    });

    // Upsert prospects + initial outreach state. Dedupe by (campaign_id, linkedin).
    let kept = 0;
    for (const p of prospects) {
      try {
        const [inserted] = await db.insert(schema.prospects).values({
          campaignId: id,
          userId: user.id,
          name: p.name,
          title: p.title,
          company: p.company,
          linkedin: p.linkedin,
          score: p.score,
          why: p.why,
          rawNotes: p.rawNotes ?? {},
        }).onConflictDoUpdate({
          target: [schema.prospects.campaignId, schema.prospects.linkedin],
          set: {
            name: p.name,
            title: p.title,
            company: p.company,
            score: p.score,
            why: p.why,
          },
        }).returning();

        // Seed outreach state if not present.
        await db.insert(schema.outreachState).values({
          prospectId: inserted.id,
          userId: user.id,
          status: 'pending',
        }).onConflictDoNothing();

        kept++;
      } catch (err) {
        logLines.push(`[insert] ${p.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Finalize the run row.
    await db.update(schema.runs)
      .set({
        status: errors.length && kept === 0 ? 'error' : 'ok',
        finishedAt: new Date(),
        prospectsFound: prospects.length,
        prospectsKept: kept,
        error: errors.length ? errors.map(e => `${e.target}: ${e.error}`).join(' | ').slice(0, 2000) : null,
        log: logLines.join('\n').slice(0, 20000),
      })
      .where(and(eq(schema.runs.id, runRow.id), eq(schema.runs.userId, user.id)));

    return NextResponse.json({ ok: true, runId: runRow.id, kept, found: prospects.length, errors });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'UNAUTHENTICATED') return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
    return NextResponse.json({ ok: false, error: e?.message ?? String(err) }, { status: 500 });
  }
}
