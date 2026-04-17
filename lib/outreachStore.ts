// Outreach state mutations, scoped to user + prospect. Writes to outreach_state table.

import { and, eq } from 'drizzle-orm';
import { getDb, schema } from './db';
import type {
  MessageDraft, Channel, TimelineEvent, TimelineEventKind, OutreachStatus,
} from './types';

function nowIso() { return new Date().toISOString(); }

async function ensureRow(userId: string, prospectId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.outreachState)
    .where(and(eq(schema.outreachState.userId, userId), eq(schema.outreachState.prospectId, prospectId)))
    .limit(1);
  if (rows.length) return rows[0];
  const [row] = await db
    .insert(schema.outreachState)
    .values({ userId, prospectId, status: 'pending' })
    .onConflictDoNothing()
    .returning();
  return row ?? rows[0];
}

function pushEvent(timeline: unknown, evt: TimelineEvent): TimelineEvent[] {
  const prev: TimelineEvent[] = Array.isArray(timeline) ? (timeline as TimelineEvent[]) : [];
  return [...prev, evt];
}

async function mutate(
  userId: string,
  prospectId: string,
  fn: (cur: typeof schema.outreachState.$inferSelect) => Partial<typeof schema.outreachState.$inferSelect>,
) {
  const cur = await ensureRow(userId, prospectId);
  if (!cur) throw new Error('outreach row not found and could not be created');
  const db = getDb();
  const patch = fn(cur);
  const [row] = await db
    .update(schema.outreachState)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(schema.outreachState.userId, userId), eq(schema.outreachState.prospectId, prospectId)))
    .returning();
  return row;
}

export async function setStatus(userId: string, prospectId: string, next: OutreachStatus) {
  return mutate(userId, prospectId, cur => {
    if (cur.status === next) return {};
    const evt: TimelineEvent = {
      at: nowIso(),
      kind: 'status-change',
      summary: `${cur.status} → ${next}`,
      data: { from: cur.status, to: next },
    };
    return { status: next, timeline: pushEvent(cur.timeline, evt) };
  });
}

export async function setNote(userId: string, prospectId: string, note: string) {
  return mutate(userId, prospectId, () => ({ note }));
}

export async function setEmail(userId: string, prospectId: string, email: string, source: 'apollo' | 'manual') {
  return mutate(userId, prospectId, cur => {
    const evt: TimelineEvent = {
      at: nowIso(),
      kind: 'enriched',
      summary: `email via ${source}: ${email}`,
      data: { email, source },
    };
    return {
      timeline: pushEvent(cur.timeline, evt),
    };
  }).then(async row => {
    // email lives on the prospects table, not outreach_state
    const db = getDb();
    await db.update(schema.prospects)
      .set({ email, emailSource: source })
      .where(and(eq(schema.prospects.userId, userId), eq(schema.prospects.id, prospectId)));
    return row;
  });
}

export async function saveDraft(userId: string, prospectId: string, draft: MessageDraft) {
  return mutate(userId, prospectId, cur => {
    const prevDrafts = (cur.drafts as { linkedin?: MessageDraft; email?: MessageDraft }) ?? {};
    const drafts = { ...prevDrafts, [draft.channel]: draft };
    const evt: TimelineEvent = {
      at: nowIso(),
      kind: 'drafted',
      summary: `drafted ${draft.channel} message (${draft.model})`,
      data: { channel: draft.channel },
    };
    const patch: Partial<typeof schema.outreachState.$inferSelect> = {
      drafts,
      timeline: pushEvent(cur.timeline, evt),
    };
    if (cur.status === 'pending') patch.status = 'drafted';
    return patch;
  });
}

export async function markSent(userId: string, prospectId: string, channel: Channel) {
  return mutate(userId, prospectId, cur => {
    const evt: TimelineEvent = {
      at: nowIso(),
      kind: channel === 'linkedin' ? 'sent-linkedin' : 'sent-email',
      summary: `marked ${channel} as sent`,
      data: { channel },
    };
    const patch: Partial<typeof schema.outreachState.$inferSelect> = {
      timeline: pushEvent(cur.timeline, evt),
    };
    if (cur.status !== 'replied') {
      patch.status = channel === 'linkedin' ? 'contacted' : 'sent';
    }
    return patch;
  });
}

export async function setFollowupDue(userId: string, prospectId: string, iso: string | null) {
  return mutate(userId, prospectId, cur => {
    if (iso) {
      const evt: TimelineEvent = {
        at: nowIso(),
        kind: 'followup-scheduled',
        summary: `follow-up due ${iso}`,
        data: { iso },
      };
      return { followupDue: iso, timeline: pushEvent(cur.timeline, evt) };
    }
    return { followupDue: null };
  });
}

// small unused-var guard so typecheck is happy across all kinds
export type _kinds = TimelineEventKind;
