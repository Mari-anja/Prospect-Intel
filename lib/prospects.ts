import { and, desc, eq } from 'drizzle-orm';
import { getDb, schema } from './db';
import type { Prospect, OutreachRow } from './db/schema';

export interface ProspectWithOutreach extends Prospect {
  outreach: OutreachRow | null;
}

export async function listProspects(userId: string, campaignId: string): Promise<ProspectWithOutreach[]> {
  const db = getDb();
  const rows = await db
    .select({
      p: schema.prospects,
      o: schema.outreachState,
    })
    .from(schema.prospects)
    .leftJoin(schema.outreachState, eq(schema.outreachState.prospectId, schema.prospects.id))
    .where(and(eq(schema.prospects.userId, userId), eq(schema.prospects.campaignId, campaignId)))
    .orderBy(desc(schema.prospects.score));
  return rows.map(r => ({ ...r.p, outreach: r.o }));
}

export async function getProspect(userId: string, prospectId: string): Promise<ProspectWithOutreach | null> {
  const db = getDb();
  const rows = await db
    .select({ p: schema.prospects, o: schema.outreachState })
    .from(schema.prospects)
    .leftJoin(schema.outreachState, eq(schema.outreachState.prospectId, schema.prospects.id))
    .where(and(eq(schema.prospects.userId, userId), eq(schema.prospects.id, prospectId)))
    .limit(1);
  if (!rows.length) return null;
  return { ...rows[0].p, outreach: rows[0].o };
}
