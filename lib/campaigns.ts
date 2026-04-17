// Campaign-level CRUD. All calls must be scoped to a single userId (enforced
// by requireUser() at the route layer).

import { and, eq, desc } from 'drizzle-orm';
import { getDb, schema } from './db';
import type { IcpConfig, PriorityTarget } from './types';
import { DEFAULT_ICP } from './types';

export type CampaignKind = 'client' | 'investor' | 'custom';

export interface CampaignSummary {
  id: string;
  name: string;
  kind: CampaignKind;
  prospectCount: number;
  updatedAt: string;
}

export async function listCampaigns(userId: string): Promise<CampaignSummary[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.campaigns)
    .where(eq(schema.campaigns.userId, userId))
    .orderBy(desc(schema.campaigns.updatedAt));

  // Single aggregate-ish query: grab counts per campaign. For V0 this is fine;
  // optimize later if user has many campaigns.
  const counts = await db
    .select({ campaignId: schema.prospects.campaignId })
    .from(schema.prospects)
    .where(eq(schema.prospects.userId, userId));
  const countMap = new Map<string, number>();
  for (const c of counts) countMap.set(c.campaignId, (countMap.get(c.campaignId) ?? 0) + 1);

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    kind: (r.kind as CampaignKind) ?? 'custom',
    prospectCount: countMap.get(r.id) ?? 0,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getCampaign(userId: string, campaignId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.campaigns)
    .where(and(eq(schema.campaigns.userId, userId), eq(schema.campaigns.id, campaignId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCampaign(userId: string, input: { name: string; kind: CampaignKind }) {
  const db = getDb();
  const [row] = await db
    .insert(schema.campaigns)
    .values({
      userId,
      name: input.name,
      kind: input.kind,
      briefMd: '',
      icpConfig: DEFAULT_ICP,
      priorityTargets: [],
      voiceRules: '',
    })
    .returning();
  return row;
}

export async function updateCampaign(
  userId: string,
  campaignId: string,
  patch: Partial<{
    name: string;
    briefMd: string;
    icpConfig: IcpConfig;
    priorityTargets: PriorityTarget[];
    voiceRules: string;
  }>,
) {
  const db = getDb();
  const [row] = await db
    .update(schema.campaigns)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(schema.campaigns.userId, userId), eq(schema.campaigns.id, campaignId)))
    .returning();
  return row ?? null;
}

export async function deleteCampaign(userId: string, campaignId: string) {
  const db = getDb();
  // Also delete dependent rows. In a future migration we'd add ON DELETE CASCADE
  // at the DB level; for now, explicit.
  await db.delete(schema.outreachState).where(and(eq(schema.outreachState.userId, userId)));
  await db.delete(schema.prospects).where(
    and(eq(schema.prospects.userId, userId), eq(schema.prospects.campaignId, campaignId)),
  );
  await db.delete(schema.runs).where(
    and(eq(schema.runs.userId, userId), eq(schema.runs.campaignId, campaignId)),
  );
  await db.delete(schema.campaigns).where(
    and(eq(schema.campaigns.userId, userId), eq(schema.campaigns.id, campaignId)),
  );
}
